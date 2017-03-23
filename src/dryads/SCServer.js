/* @flow */
import { Dryad } from 'dryadic';
import { boot } from '../server/server';
import _ from 'lodash';

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
  defaultProperties(): Object {
    return {
      options: defaultOptions
    };
  }

  initialContext(): Object {
    return {
      out: 0,
      group: 0
    };
  }

  prepareForAdd(): Object {
    return {
      callOrder: 'SELF_THEN_CHILDREN',
      updateContext: (context, properties) => ({
        scserver: boot(_.defaults(properties.options, { log: context.log }))
      })
    };
  }

  remove(): Object {
    return {
      run: context => {
        if (context.scserver) {
          return context.scserver.quit();
        }
      }
    };
  }
}
