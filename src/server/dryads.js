
import {withContext, makeChildContext, callAndResolve, callAndResolveValues, callAndResolveAll, dryadic} from './dryadic';
import * as msg from './osc/msg';
import {bootServer, bootLang, sendMsg, nextNodeID, interpret} from './internals/side-effects';
import {whenNodeGo, updateNodeState} from './node-watcher';
import {Promise} from 'bluebird';

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
          const oscMessage = msg.synthNew(resolvedDefName, nodeID, msg.AddActions.TAIL, context.group, args);
          sendMsg(context, oscMessage);

          return whenNodeGo(context.server, context.id, nodeID)
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
      var message = msg.groupNew(nodeID, msg.AddActions.TAIL, context.group);
      sendMsg(context, message);
      return whenNodeGo(context.server, context.id, nodeID)
        .then(() => {
          return callAndResolveAll(children, context);
        });
    });
  };
}


/**
 * Compile a SynthDef from a snippet of supercollider source code,
 * send it to the server and stores the SynthDesc in server.state
 *
 * @param {String} defName
 * @param {String} sourceCode - Supports SynthDef, {}, Instr and anything else that responds to .asSynthDef
 */
export function compileSynthDef(defName, sourceCode) {
  const compiler = dryadic((context) => {
    // Better to use an isolated sclang so any Quarks won't try to mess with this Server
    var fullCode = `{
      var def = SynthDef("${ defName }", ${ sourceCode });
      (
        synthDesc: def.asSynthDesc.asJSON(),
        bytes: def.asBytes()
      )
    }.value`;

    return interpret(context, fullCode).then((result) => {
      putSynthDef(context, defName, result.synthDesc);
      return context.server.callAndResponse(msg.defRecv(new Buffer(result.bytes)))
        .then((r) => defName);
    }, (error) => {
      return Promise.reject({
        description: `Failed to compile SynthDef '${defName}'`,
        error: error.error,
        sourceCode: sourceCode
      });
    });
  });
  return requireServer(requireInterpreter(compiler));
}


export function putSynthDef(context, defName, synthDesc) {
  context.server.mutateState(StateKeys.SYNTH_DEFS, (state) => {
    return state.set(defName, synthDesc);
  });
}

/**
 * Boots a new supercollider interpreter making it available for all children.
 *
 * Ignores any possibly already existing one in context.
 */
export function interpreter(children=[], options={}) {
  const defaultOptions = {
    stdin: false,
    echo: true,  // that will make it post OSC send/recv
    debug: false
  };
  return dryadic((context) => {
    return bootLang(_.defaults(options, defaultOptions))
      .then((lang) => {
        return callAndResolveAll(children,
          _.assign({}, context, {lang: lang}));
      });
  });
}


/**
 * Boots a supercollider interpreter if none is already available
 * in the context.
 */
export function requireInterpreter(child, options={}) {
  return dryadic((context) => {
    if (!context.lang) {
      return interpreter([child], options)(context)
        .then((resolved) => resolved[0]);
    }
    return callAndResolve(child, context);
  });
}


/**
 * Boots a new supercollider server making it available for all children.
 *
 * Always boots a new one, ignoring any possibly already existing one in context.
 */
export function server(children=[], options={}) {
  const defaultOptions = {
    stdin: false,
    echo: true,  // that will make it post OSC send/recv
    debug: false
  };
  return dryadic((context) => {
    return bootServer(_.defaults(options, defaultOptions))
      .then((s) => {
        return callAndResolveAll(children,
          _.assign({}, context, {server: s, group: 0}));
      });
  });
}


/**
 * Boots a supercollider server if none is already available
 * in the context.
 */
export function requireServer(child, options={}) {
  return dryadic((context) => {
    if (!context.server) {
      return server([child], options)(context)
        .then((resolved) => resolved[0]);
    }
    return callAndResolve(child, context);
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
