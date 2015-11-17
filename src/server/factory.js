
import * as msg from './osc/msg';
import _ from 'underscore';
import {bootServer, bootLang, sendMsg, nextNodeID} from './internals/side-effects';
import {nodeGo, updateNodeState} from './node-watcher';


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
    deps.lang = bootLang;
  if (requireSClang && !context.lang) {
  }

  var promise = callAndResolveValues(deps, context).then((resolvedDeps) => {
    if (resolvedDeps.server) {
      // set root node
      resolvedDeps.group = 0;
    }
    return _.extend(context, resolvedDeps);
  });
  return promise;
}


export function makeChildContext(parentContext, keyName) {
  return _.assign({id: parentContext.id + '.' + keyName});
}


/**
 * If value is a function then call it,
 * if function returns a Promise then resolve it.
 */
function callAndResolve(value, context, keyName) {
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


/**
 * Generates a function that will spawn a Synth when it is called
 *
 * When the function is called, it returns a Promise that will
 * -- when the Synth has succesfully started playing --
 * resolve with the Synth's nodeID.
 *
 * @param {String|Function} synthDefName - the name of the synthDef
 *     or a function that can be called and resolve to a synthDef name
 * @param {Object} args - Arguments may be int|float|string
      If an argument is a function then it will be called.
      If that returns a Promise then it will be resolved and the result of that
      is the final value passed to the Synth.
 * @returns {Function} - when evaluated returns a Promise that resolves with the Synth starts
 */
export function synth(synthDefName, args={}) {
  return (parentContext) => {
    return withContext(parentContext, true).then((context) => {
      return callAndResolve(synthDefName, context, 'def').then((resolvedDefName) => {
        const nodeID = nextNodeID(context);
        context.nodeID = nodeID;

        // will need to store the children ids
        return callAndResolveValues(args, context).then((args) => {
          const oscMessage = msg.synthNew(resolvedDefName, nodeID, msg.addAction.TAIL, context.group, args);

          sendMsg(context, oscMessage);

          return nodeGo(context.server, context.id, nodeID)
            .then((nodeID) => {
              updateNodeState(context.server, nodeID, {synthDef: resolvedDefName});
              return nodeID;
            });
        });
      });
    });
  };
}


export function group(children) {
  return (parentContext) => {
    return withContext(parentContext, true).then((context) => {

      const nodeID = context.server.nextNodeID();
      var msg = msg.groupNew(nodeID, msg.addAction.TAIL, context.group);
      sendMsg(context, msg);

      // for now, no notifier
      return Promise.resolve(nodeID);
      // then play children with my context
    });
  };
}

// compileSynthDef(source)
// loadSynthDef(path, defName)
// buffer(secs, numChans)
// loadBuffer(path)
// include('jsmodule', 'funcname')
// server  create a new one, scope it below this
// sclang  create a new interpreter
