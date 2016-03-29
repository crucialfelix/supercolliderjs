
import {Dryad} from 'dryadic';
import {boot} from '../server/server';

const defaultOptions = {
  debug: false
};

/**
 * Boots a new SuperCollider server (scsynth) making it available for all children as `context.scserver`
 *
 * Always boots a new one, ignoring any possibly already existing one in the parent context.
 *
 * `options` are the command line options supplied to scsynth (note: not all options are passed through yet)
 * see {@link Server}
 */
export default class SCServer extends Dryad {

  defaultProperties() {
    return {
      options: defaultOptions
    };
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
