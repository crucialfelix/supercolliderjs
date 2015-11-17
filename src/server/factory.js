
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
  var pc = _.assign({id: 0}, parentContext);

  var deps = {};
  if (requireSCSynth && !pc.server) {
    deps.server = bootServer;
  }
  if (requireSClang && !pc.lang) {
    deps.lang = bootLang;
  }

  return resolveValues(deps).then((resolvedDeps) => {
    if (resolvedDeps.server) {
      // set root node
      resolvedDeps.group = 0;
    }
    return _.extend({},
      pc,
      resolvedDeps,
      {
        // wrong, the siblings would have same id
        // parent should pass ids out to the children
        id: pc.id + 1
      });
  });
}


/**
 * Resolve each of the values of an Object.
 *
 * @param {Object} object
 * @returns {Promise} - Object with resolved results
 */
export function resolveValues(object) {
  const keys = _.keys(object);
  var promises = _.map(keys, (key) => {
    var v = object[key];
    if (_.isFunction(v)) {
      v = v();
    }
    return Promise.resolve(v);
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
      return resolveValues({defName: synthDefName}, context).then((synthDefResult) => {
        const nodeID = nextNodeID(context);
        context.nodeID = nodeID;

        return resolveValues(args, context).then((args) => {
          const oscMessage = msg.synthNew(synthDefResult.defName, nodeID, msg.addAction.TAIL, context.group, args);

          sendMsg(context, oscMessage);

          return nodeGo(context.server, context.id, nodeID)
            .then((nodeID) => {
              updateNodeState(context.server, nodeID, {synthDef: synthDefResult.defName});
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
