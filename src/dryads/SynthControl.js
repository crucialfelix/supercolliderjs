
import {Dryad} from 'dryadic';
import {nodeSet} from '../server/osc/msg';
import * as _  from 'underscore';


export default class SynthControl extends Dryad {

  constructor(stream, initial={}, children=[]) {
    super({stream, initial}, children);
  }

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
