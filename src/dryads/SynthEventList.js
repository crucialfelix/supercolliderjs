
import {Dryad} from 'dryadic';
import Group from './Group';
import {
  synthNew,
  AddActions
} from '../server/osc/msg';
import * as _  from 'underscore';


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
          return this._makeSchedLoop(this.properties.events || [], context.epoch, context);
        }
      }
    };

    if (this.properties.updateStream) {
      commands.run = (context) => {
        let subscription = this.properties.updateStream.subscribe((streamEvent) => {
          let ee = streamEvent.value();
          player.callCommand(context.id, {
            scserver: {
              schedLoop: this._makeSchedLoop(ee.events, ee.epoch, context)
            }
          });
        });

        player.updateContext(context, {subscription});
      };
    }

    return commands;
  }

  _makeSchedLoop(events, epoch, context) {
    const sorted = this._makeMsgs(events, context);
    return (now, memo={i: 0}) => {
      for (let i = memo.i; i < sorted.length; i += 1) {
        let e = sorted[i];
        let delta = e.time - now;
        if (delta >= 0) {
          return {
            time: e.time,
            msgs: e.msgs,
            memo: {i: i + 1}
          };
        }
      }
    }
  }

  _makeMsgs(events, context) {
    const defaultParams = this.properties.defaultParams || {};
    return events.sort((a, b) => a.time - b.time).map((event) => {
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
