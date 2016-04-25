
import {Dryad} from 'dryadic';
import Group from './Group';
import {synthNew, AddActions} from '../server/osc/msg.js';
import * as _  from 'underscore';


/**
 * Given a Bacon.js stream that returns objects, this spawns a series of Synths.
 *
 * Properties:
 *  {Bacon.EventStream} stream
 *  {Object} defaultParams
 *
 * The event values should be simple JavaScript objects:
 *
 * {
 *   defName: 'synthDefName',
 *   args: {
 *     out: 0,
 *     freq: 440
 *   }
 * }
 *
 * defaultParams is a fixed object into which the event value is merged.
 */
export default class SynthStream extends Dryad {

  add(player) {
    return {
      run: (context) => {
        let subscription = this.properties.stream.subscribe((event) => {
          // This assumes a Bacon event.
          // Should validate that event.value is object
          let ev = event.value();
          let defaultParams = this.properties.defaultParams || {};
          const args = _.assign({out: context.out || 0}, defaultParams.args, ev.args);
          const defName = ev.defName || this.properties.defaultParams.defName;
          const synth = synthNew(defName, -1, AddActions.TAIL, context.group, args);
          player.callCommand(context.id, {
            scserver: {
              bundle: {
                time: 0.03,
                packets: [synth]
              }
            }
          });
        });
        player.updateContext(context, {subscription});
      }
    };
  }

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
      }
    };
  }

  subgraph() {
    return new Group({}, [this]);
  }
}
