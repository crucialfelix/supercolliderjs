import { msg, OscType } from "@supercollider/server";
import { Dryad, DryadPlayer, Command } from "dryadic";
import _ from "lodash";

import Group from "./Group";
import { OSCEvent } from "./middleware/OSCSched";
import { Event, eventListIterator, loopedEventListIterator } from "./utils/iterators";

const { AddActions, synthNew } = msg;

interface Params {
  [name: string]: OscType;
}

interface SynthEvent extends Event {
  defName: string;
  args: {
    [name: string]: OscType;
  };
}

interface Properties {
  events: SynthEvent[];
  loopTime?: number;
  defaultParams?: Params;
  // @deprecated
  updateStream?: any;
}

interface Context {
  group: number;
  out: number;
  epoch: number;
  subscription?: any; // Bacon or RxJs
  id: string;
}

interface AddCommand extends Command {
  scserver: {
    schedLoop: (context: Context, properties: Properties) => Function;
  };
  // run?: (context: Context, properties: Properties) => Promise<void>;
}

/**
 * Takes a list of synth event objects with relative times and schedules them.
 *
 * #### properties
 *
 * __events:__ Array
 *
 * The event values should be simple JavaScript objects:
 *
 *     {
 *       defName: 'synthDefName',
 *       args: {
 *         out: 0,
 *         freq: 440
 *       },
 *       time: 0.3
 *     }
 *
 *  Where time is seconds relative to the epoch. The epoch is the start time of
 *  the dryadic tree, unless a parent Dryad has set a new epoch into context.
 *
 *    epoch: number|Date|undefined
 *      Optional epoch that the event times in the list are relative to.
 *      Can also be updated by the updateStream
 *      default: context.epoch or now
 *
 * __updateStream:__ Bacon stream to push updated event lists of the form:
 *
 *      {
 *        events: [{time: msgs: []}...],
 *        epoch: 123456789
 *      }

 *     .events Array
 *     .epoch  number|Date
 *
 * Deprecated: will be replaced with live updating and setting of
 * Any value in a dryadic document from the player or remote client.
 *
 * Pushing a new event list cancels previous events and schedules new events.
 *
 * Note that by default the epoch will be unchanged: relative times
 * are still relative to when the Dryad tree started playing or when any parent
 * Dryad set an epoch in context. This means you update the currently playing score
 * but it doesn't restart from the beginning, it keeps playing.
 *
 * Optionally you may push an .epoch with the updateStream. This can be a date or timestamp
 * slightly in the future. If you pass "now" then any events at `0.0` will be too late to play.
 *
 * __defaultParams:__ a fixed object into which the event value is merged.
 *
 * __loopTime:__ Play the events continuously in a loop.
 */
export default class SynthEventList extends Dryad<Properties> {
  defaultProperties(): Properties {
    return { events: [] };
  }

  add(player: DryadPlayer): AddCommand {
    let commands = {
      scserver: {
        schedLoop: (context: Context, properties: Properties) => {
          // temporary: we need to know the play time of the whole document
          const epoch = context.epoch || _.now() + 200;
          if (epoch !== context.epoch) {
            context = player.updateContext(context, { epoch }) as Context;
          }

          // epoch, was 3rd arg
          return this._makeSchedLoop(properties.events || [], properties.loopTime, context);
        },
      },
    };

    // built-in stream support will be added to Dryadic
    // for now it is hard to detect Bacon.Bus as being an object,
    if (this.properties.updateStream) {
      commands = _.assign(commands, {
        run: (context: Context, properties: Properties) => {
          const subscription = properties.updateStream.subscribe(streamEvent => {
            const ee = streamEvent.value();
            const loopTime = _.isUndefined(ee.loopTime) ? properties.loopTime : ee.loopTime;
            const epoch = ee.epoch || context.epoch || _.now() + 200;
            if (epoch !== context.epoch) {
              context = player.updateContext(context, {
                epoch,
              }) as Context;
            }

            player.callCommand(context.id, {
              scserver: {
                // need to set epoch as well because OSCSched uses that for relative times
                schedLoop: (ctx: Context /*, props*/) => this._makeSchedLoop(ee.events || [], loopTime, ctx),
              },
            });
          });

          player.updateContext(context, { subscription });
        },
      });
    }

    return commands;
  }

  private _makeSchedLoop(events: SynthEvent[], loopTime: number | undefined, context: Context): Function {
    const synthEvents = this._makeMsgs(events, context);
    return loopTime ? loopedEventListIterator(synthEvents, loopTime) : eventListIterator(synthEvents);
  }

  private _makeMsgs(events: SynthEvent[], context: Context): OSCEvent[] {
    const defaultParams = this.properties.defaultParams || {};
    return events.map(event => {
      // TODO: do this a jit time in the schedLoop
      const defName = event.defName || defaultParams.defName;
      const args = _.assign({ out: context.out || 0 }, defaultParams.args, event.args);
      const msg = synthNew(defName as string, -1, AddActions.TAIL, context.group, args);
      return {
        time: event.time,
        msgs: [msg],
      };
    });
  }

  remove(): Command {
    return {
      run: (context: Context) => {
        if (context.subscription) {
          if (_.isFunction(context.subscription)) {
            // baconjs style
            context.subscription();
          } else {
            // Rx style
            context.subscription.dispose();
          }
        }
      },
      scserver: {
        sched: (context: Context) => {
          // unschedAll
          return this._makeSchedLoop([], undefined, context);
        },
      },
    };
  }

  /**
   * @return {Dryad}  Wraps itself in a Group so all child Synth events will be removed on removal of the Group.
   */
  subgraph(): Dryad {
    return new Group({}, [this]);
  }
}
