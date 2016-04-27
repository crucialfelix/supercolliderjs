
import {Dryad} from 'dryadic';
import Group from './Group';
import {
  synthNew,
  AddActions
} from '../server/osc/msg';
import * as _  from 'underscore';
import { deltaTimeTag } from '../server/osc/utils';


/**
 * Takes a list of synth event objects with relative times and schedules them.
 *
 * properties:
 *
 *   events: Array
 *    The event values should be simple JavaScript objects:
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
 * 		Where time is seconds relative to the epoch. The epoch is the start time of
 *   	the dryadic tree, unless a parent Dryad has set a new epoch into context.
 *
 * 	 epoch: number|Date|undefined
 * 	 	Optional epoch that the event times in the list are relative to.
 * 	 	Can also be updated by the updateStream
 * 	 	default: context.epoch or now
 *
 *   updateStream: Bacon stream to push updated event lists of the form:
 *   	.events Array
 *   	.epoch  number|Date
 *
 *   	Pushing a new event list cancels previous events (not yet implemented)
 *   	and schedules new events.
 *
 *   	Note that by default the epoch will be unchanged: relative times
 *   	are still relative to when the Dryad tree started playing or when any parent
 *   	Dryad set an epoch in context. This means you update the currently playing score
 *   	but it doesn't restart from the beginning, it keeps playing.
 *
 * 		Optionally you may push an .epoch with the updateStream. This can be a date or timestamp
 *   	slightly in the future. If you pass "now" then any events at 0.0 will be too late to play.
 *
 *   defaultParams: a fixed object into which the event value is merged.
 */
export default class SynthEventList extends Dryad {

  add(player) {
    let commands = {
      scserver: {
        sched: (context) => {
          return this._schedEvents(this.properties.events || [], context);
        }
      }
    };

    if (this.properties.updateStream) {
      commands.run = (context) => {
        let subscription = this.properties.updateStream.subscribe((streamEvent) => {
          let ee = streamEvent.value();
          // TODO: cancel previous
          player.callCommand(context.id, {
            scserver: {
              sched: () => this._schedEvents(ee.events, context, ee.epoch)
            }
          });
        });
        player.updateContext(context, {subscription});
      };
    }

    return commands;
  }

  _schedEvents(events, context, epoch) {
    const defaultParams = this.properties.defaultParams || {};
    return events.map((event) => {
      const defName = event.defName || defaultParams.defName;
      const args = _.assign({out: context.out || 0}, defaultParams.args, event.args);
      const msg = synthNew(defName, -1, AddActions.TAIL, context.group, args);
      // epoch: takes a Date or date.getTime()
      // find first defined
      const ep = _.find([epoch, this.properties.epoch, context.epoch, _.now()], (d) => !_.isUndefined(d));
      const time = deltaTimeTag(event.time, ep);
      return {
        time,
        packets: [msg]
      };
    });
  }

  remove() {
    return {
      run: (context) => {
        if (context.updateStream) {
          if (_.isFunction(context.subscription)) {
            // baconjs style
            context.subscription();
          } else {
            // Rx style
            context.subscription.dispose();
          }
        }
      }
    };
  }

  subgraph() {
    return new Group({}, [this]);
  }
}
