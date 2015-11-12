
import * as msg from './osc/msg';
import _ from 'underscore';
import {bootServer, bootLang, sendMsg, nextNodeID} from './internals/side-effects';


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
 * @param {String|Function} synthDef
 *     If the synthDef is a function, it will be called and resolved.
 * @param {Object} args - Arguments may be int|float|string
      If an argument is a function then it will be called.
      If that returns a Promise then it will be resolved and the result of that
      is the final value passed to the Synth.
 * @returns {Function} - when evaluated returns a Promise
 */
export function synth(synthDef, args={}) {
  return (parentContext) => {
    return withContext(parentContext, true).then((context) => {
      return resolveValues({defName: synthDef}, context).then((synthDefResult) => {
        return resolveValues(args, context).then((args) => {

          const nodeID = nextNodeID(context);
          var oscMessage = msg.synthNew(synthDefResult.defName, nodeID, msg.addAction.TAIL, context.group, args);

          sendMsg(context, oscMessage);

          // return new Promise(function(resolve, reject) {
          //   // on n_go resolve and unsubscribe
          //   // on n_off or other failure then reject
          //   // registers for notification
          //   //   on
          //   //   off
          //   //   server quit it kills all responders
          //   //   op context stop
          //
          // });
          // for now, no notifier
          return Promise.resolve(nodeID);
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
