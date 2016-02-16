
import {Dryad} from 'dryadic';
import Group from './Group';
import {synthNew, AddActions} from '../server/osc/msg.js';
import * as _  from 'underscore';


export default class SynthStream extends Dryad {

  constructor(stream, defaultParams={}) {
    super({stream, defaultParams}, []);
  }

  add() {
    return {
      run: (context) => {
        context.subscription = this.properties.stream.subscribe((event) => {
          let ev = event.value();
          const args = _.assign({}, this.properties.defaultParams.args, ev.args);
          const defName = ev.defName || this.properties.defaultParams.defName;
          const synth = synthNew(defName, -1, AddActions.TAIL, context.group, args);
          context.scserver.send.bundle(0.03, [synth]);
        });
      }
    };
  }

  remove() {
    return {
      run: (context) => context.subscription()
    };
  }

  subgraph() {
    return new Group([this]);
  }
}
