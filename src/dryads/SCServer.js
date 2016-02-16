
import {Dryad} from 'dryadic';
import {boot} from '../server/server';


/**
 * Boots a new SuperCollider server (scsynth) making it available for all children.
 *
 * Always boots a new one, ignoring any possibly already existing one in context.
 */
export default class SCServer extends Dryad {

  constructor(options={debug: false}, children=[]) {
    super({options}, children);
  }

  prepareForAdd() {
    return {
      scserver: () => boot(this.properties.options),
      group: 0
    };
  }

  remove() {
    return {
      run: (context) => {
        return context.scserver.quit();
      }
    };
  }
}
