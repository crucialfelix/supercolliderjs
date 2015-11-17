
import _ from 'underscore';
import {bootServer, bootLang} from './internals/side-effects';

/**
 * Create a context, inheriting from parentContext.
 *
 * @param {Object|undefined} parentContext
 * @param {Boolean} requireSCSynth - will boot server if required
 * @param {Boolean} requireSClang - will boot language interpreter if required
 */
export function withContext(parentContext, requireSCSynth=false, requireSClang=false) {
  var context = _.assign({id: '0'}, parentContext);

  var deps = {};
  if (requireSCSynth && !context.server) {
    deps.server = bootServer;
  }
  if (requireSClang && !context.lang) {
    deps.lang = () => {
      const options = {
        stdin: false,
        echo: false,
        debug: false
        // langPort
      };
      return bootLang(options);
    };
  }

  var promise = callAndResolveValues(deps, context).then((resolvedDeps) => {
    if (resolvedDeps.server) {
      // set root node
      resolvedDeps.group = 0;
    }
    return _.extend(context, resolvedDeps);
  });
  // Top level call, raise all exceptions
  if (!parentContext) {
    return promise.then((ok) => ok, (error) => console.error(error));
  }
  return promise;
}


export function makeChildContext(parentContext, keyName) {
  return _.assign({}, parentContext, {id: parentContext.id + '.' + keyName});
}


/**
 * If value is a function then call it,
 * if function returns a Promise then resolve it.
 */
export function callAndResolve(value, context, keyName) {
  if (_.isFunction(value)) {
    value = value(makeChildContext(context, keyName || '_'));
  }
  return Promise.resolve(value);
}


/**
 * Call and resolve each of the values of an Object.
 *
 * @param {Object} object - whose values will be called and resolved
 * @param {Object} context - which is passed into any Functions
 * @returns {Promise} - resolves to an Object with values mapped to the resolved results
 */
export function callAndResolveValues(object, context) {
  const keys = _.keys(object);
  if (_.isUndefined(context)) {
    throw new Error('Missing context for callAndResolveValues');
  }
  const promises = _.map(keys, (key, i) => {
    return callAndResolve(object[key], context, i);
  });

  return Promise.all(promises).then((values) => {
    var result = {};
    keys.forEach((key, i) => {
      result[key] = values[i];
    });
    return result;
  });
}
