
import {withContext, makeChildContext, callAndResolve, callAndResolveValues} from './dryadic';
import * as msg from './osc/msg';
import {bootServer, bootLang, sendMsg, nextNodeID, interpret} from './internals/side-effects';
import {nodeGo, updateNodeState} from './node-watcher';

const StateKeys = {
  SYNTH_DEFS: 'SYNTH_DEFS'
};


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

      const nodeID = nextNodeID(context);
      var msg = msg.groupNew(nodeID, msg.addAction.TAIL, context.group);
      sendMsg(context, msg);

      return nodeGo(server, context.id, nodeID);
      // then spawn children...
    });
  };
}


/**
 * Compile a SynthDef from a snippet of supercollider source code
 * send it to the server and stores the SynthDesc in server.state
 *
 * @param {String} defName
 * @param {String} sourceCode - Supports SynthDef, {}, Instr and anything else that responds to .asSynthDef
 */
export function compileSynthDef(defName, sourceCode) {
  return (parentContext) => {
    return withContext(parentContext, true, true).then((context) => {
      var host = context.server.options.host;
      var port = context.server.options.port;
      var fullCode = `{
        var def = (${ sourceCode }).asSynthDef(name: "${ defName }");
        def.doSend(Server("server", NetAddr("${ host }", ${ port })));
        def.asSynthDesc.asJSON();
      }.value`;

      return interpret(context, fullCode).then((result) => {
        putSynthDef(context, defName, result);
        return defName;
      }, (error) => {
        return Promise.reject(error);
      });
    });
  };
}


export function putSynthDef(context, defName, synthDesc) {
  context.server.mutateState(StateKeys.SYNTH_DEFS, (state) => {
    return state.set(defName, synthDesc);
  });
}

// interpret
// interpretFile
// loadSynthDef(path, defName)
// buffer(secs, numChans)
// loadBuffer(path)
// include('jsmodule', 'funcname')
// exec
// fork
// streamFile
// server  create a new one, scope it below this
// sclang  create a new interpreter
