import * as _  from 'underscore';

import {Dryad} from 'dryadic';
import Group from './Group';
import {
  synthNew,
  AddActions
} from '../server/osc/msg';
import {
  loopedEventListIterator,
  eventListIterator
} from './utils/iterators';


/**
 * Takes a list of synth event objects with relative times and schedules them.
 *
 * ## properties
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
export default class SynthEventList extends Dryad {

  /**
   * @param  {DryadPlayer} player
   * @return {Object}      Command object
   */
  add(player) {
    let commands = {
      scserver: {
        schedLoop: (context) => {
          // temporary: we need to know the play time of the whole document
          const epoch = context.epoch || (_.now() + 200);
          if (epoch !== context.epoch) {
            context = player.updateContext(context, {epoch});
          }

          return this._makeSchedLoop(this.properties.events || [], this.properties.loopTime, epoch, context);
        }
      }
    };

    if (this.properties.updateStream) {
      commands.run = (context) => {
        let subscription = this.properties.updateStream.subscribe((streamEvent) => {
          let ee = streamEvent.value();
          const loopTime = _.isUndefined(ee.loopTime) ? this.properties.loopTime : ee.loopTime;

          let epoch = ee.epoch || context.epoch || (_.now() + 200);
          if (epoch !== context.epoch) {
            context = player.updateContext(context, {
              epoch
            });
          }

          player.callCommand(context.id, {
            scserver: {
              // need to set epoch as well because OSCSched uses that for relative times
              schedLoop: (ctx) => this._makeSchedLoop(ee.events || [], loopTime, epoch, ctx)
            }
          });
        });

        player.updateContext(context, {subscription});
      };
    }

    return commands;
  }

  _makeSchedLoop(events, loopTime, epoch, context) {
    const synthEvents = this._makeMsgs(events, context);
    return loopTime ? loopedEventListIterator(synthEvents, loopTime) : eventListIterator(synthEvents);
  }

  _makeMsgs(events, context) {
    const defaultParams = this.properties.defaultParams || {};
    return events.map((event) => {
      // TODO: do this a jit time in the schedLoop
      const defName = event.defName || defaultParams.defName;
      const args = _.assign({out: context.out || 0}, defaultParams.args, event.args);
      const msg = synthNew(defName, -1, AddActions.TAIL, context.group, args);
      return {
        time: event.time,
        msgs: [msg]
      };
    });
  }


  /**
   * @return {Object}  command object
   */
  remove() {
    return {
      run: (context) => {
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
        sched: (context) => {
          // unschedAll
          return this._makeSchedLoop([], context.epoch, context);
        }
      }
    };
  }


  /**
   * @return {Dryad}  Wraps itself in a Group so all child Synth events will be removed on removal of the Group.
   */
  subgraph() {
    return new Group({}, [this]);
  }
}
