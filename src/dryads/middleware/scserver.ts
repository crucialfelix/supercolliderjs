/**
 * @flow
 */
import _ from 'lodash';
import OSCSched from './OSCSched';
import type { MsgType } from '../../Types';

/**
 * Command middlware that sends OSC to the SuperCollider server (scsynth).
 *
 * Command objects are collected from each Dryad (`add()` `remove()`) and
 * this middlware is called for each Dryad that has `scserver` commands.
 *
 * @param {Object} command
 *
 * For any of these you may supply a function that is called with context
 * and returns one of these forms.
 *
 * For example, rather than:
 *
 *     msg: ['/n_free', 1005]
 *
 * you would use the context to get the node id to free:
 *
 *     msg: (context) => nodeFree(context.nodeID)
 *
 * Command may have one of these forms:
 *
 * __msg:__ {Array} - OSC message
 *
 *     msg: ['/n_free', 1005]
 *
 * __bundle:__
 *
 *     bundle: {
 *       time: null|Number|Array|Date
 *       packets: Array of OSC messages
 *     }
 *
 * __callAndResponse:__
 *
 *  Returns a Promise. Only used in preparation, not for play / update.
 *  Call and response object creator functions can be found in `osc/msg.js`
 *
 *     callAndResponse: {
 *       call: oscMessage,
 *       response: oscMessagePattern
 *     }
 *
 * __schedLoop:__
 *
 *     schedLoop: (context) => {
 *      // construct a function that will return successive events to be sent
 *      return (now, memo={i: 0}) => {
 *        return {
 *          // time in seconds relative to the context.epoch
 *          time: 0.4,
 *          msgs: [ ],
 *          // memo will be passed into the loop each time
 *          // and can be used to store iterators and loop state.
 *          memo: {i: memo.i + 1}
 *        }
 *      }
 *     }
 *
 * schedLoop takes a function that iterates through events.
 * See `OSCSched`
 *
 * It uses a just-in-time scheduler, keeping the OSC messages in the node process
 * and only sending them to the server just before they should play. This doesn't overload
 * the server with a glut of messages and also allows cancellation and updating of the messages
 * and makes it easy to implement transport controls and looping.
 *
 *
 * @param {Object} context
 * @param {Object} properties
 * @return Promise is only returned when using .callAndResponse
 */
export default function scserver(
  command: Object,
  context: Object,
  properties: Object
): ?Promise<MsgType> {
  if (command.scserver) {
    let cmds = resolveFuncs(command.scserver, context, properties);

    // send a single OSC message
    if (cmds.msg) {
      // TODO get default latency from context
      // TODO: should collect all messages into one bundle, in order
      context.scserver.send.bundle(0.05, [cmds.msg]);
    }

    // send an OSC bundle
    if (cmds.bundle) {
      context.scserver.send.bundle(cmds.bundle.time, cmds.bundle.packets);
    }

    // schedule events using a schedLoop function
    if (cmds.schedLoop) {
      // initialize the scheduler on first use
      if (!context.oscSched) {
        const sendFn = (time, packets) =>
          context.scserver.send.bundle(time, packets);
        context.oscSched = new OSCSched(sendFn);
      }

      context.oscSched.schedLoop(cmds.schedLoop, context.epoch);
    }

    // Preparation commands that get an OSC callback from the server.
    // Only this one returns.
    // These are used only in preparation, not for play / update.
    if (cmds.callAndResponse) {
      return context.scserver.callAndResponse(cmds.callAndResponse);
    }
  }
}

/**
 * Replace any functions in the command object's values with the result of
 * calling the function.
 *
 * eg. msg: (context) => { ... return ['/s_new', ...]; }
 * becomes msg: ['/s_new', ...]
 *
 * Non-functions are passed through.
 */
export function resolveFuncs(
  command: Object,
  context: Object,
  properties: Object
): Object {
  return _.mapValues(command, value => _callIfFn(value, context, properties));
}

/**
 * If its a Function then call it with context and properties
 * @private
 */
function _callIfFn(thing, context, properties) {
  return _.isFunction(thing) ? thing(context, properties) : thing;
}
