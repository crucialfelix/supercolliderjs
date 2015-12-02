
import _ from 'underscore';
import {bootServer, bootLang} from './internals/side-effects';
import {Promise} from 'bluebird';


Promise.onPossiblyUnhandledRejection((error, promise) => {
  console.error(error);
  throw Error(error);
});


export function dryadic(fn, requireSCSynth=false, requireSClang=false) {
  return (parentContext) => {
    return withContext(parentContext, requireSCSynth, requireSClang).then(fn);
  };
}


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
  const options = {
    stdin: false,
    echo: true,  // that will make it post OSC send/recv
    debug: false  // post debug messages in code, including stdout off lang/synth
    // langPort
  };
  if (requireSCSynth && !context.server) {
    deps.server = () => bootServer(options);
  }
  if (requireSClang && !context.lang) {
    deps.lang = () => bootLang(options);
  }
  return callAndResolveValues(deps, context).then((resolvedDeps) => {
    if (resolvedDeps.server) {
      // set root node
      resolvedDeps.group = 0;
    }
    return _.extend(context, resolvedDeps);
  });
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
  return Promise.map(keys, (key, i) => {
    return callAndResolve(object[key], context, i);
  }).then((values) => {
    var result = {};
    keys.forEach((key, i) => {
      result[key] = values[i];
    });
    return result;
  });
}


/**
 * Call and resolve each of the items in a list
 * @param {Array} things
 * @param {Object} parentContext
 * @returns {Promise} - resolves to an Array with the resolved things
 */
export function callAndResolveAll(things, parentContext) {
  return Promise.map(things, (thing, i) => {
    return callAndResolve(thing, parentContext, i);
  });
}
