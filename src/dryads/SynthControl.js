
import {Dryad} from 'dryadic';
import {nodeSet} from '../server/osc/msg';
import * as _  from 'underscore';


/**
 * Sends nodeSet messages to the Synth in the parent context.
 *
 * This takes a Bacon.js stream which should return objects
 * {param: value, ...} and sends `nodeSet` messages to the parent Synth.
 *
 * SynthControl should be a child of a Synth, Group or other Dryad that
 * sets context.nodeID
 */
export default class SynthControl extends Dryad {

  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent() {
    return 'SCServer';
  }

  add() {
    return {
      run: (context) => {
        if (this.properties.stream) {
          context.subscription = this.properties.stream
            .subscribe((event) => {
              // assumes bacon style event
              // should validate that event.value is object
              let msg = nodeSet(context.nodeID, event.value());
              context.scserver.send.bundle(0.03, [msg]);
            });
        }
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
          delete context.subscription;
        }
      }
    };
  }
}
