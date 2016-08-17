/* @flow */
import * as _  from 'underscore';
import OSCSched from './OSCSched';

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
 *
 *
 * @param {Object} context
 * @return {undefined|Promise}         Promise is only returned when using .callAndResponse
 */
export default function scserver(command: Object, context: Object) {
  if (command.scserver) {
    // send a single OSC message
    if (command.scserver.msg) {
      const m = callIfFn(command.scserver.msg, context);
      context.scserver.send.bundle(0.03, [m]);
    }

    // send an OSC bundle
    if (command.scserver.bundle) {
      const b = callIfFn(command.scserver.bundle, context);
      context.scserver.send.bundle(b.time, b.packets);
    }

    // schedule events using a schedLoop function
    if (command.scserver.schedLoop) {
      if (!context.oscSched) {
        const schedFn = (time, packets) => context.scserver.send.bundle(time, packets);
        context.oscSched = new OSCSched(schedFn);
      }
      // schedLoop is a function that returns the actual schedLoop function
      context.oscSched.schedLoop(command.scserver.schedLoop(context), context.epoch);
    }

    // Preparation commands that get an OSC callback from the server.
    // Only this one returns.
    // These are used only in preparation, not for play / update.
    if (command.scserver.callAndResponse) {
      const c = callIfFn(command.scserver.callAndResponse, context);
      return context.scserver.callAndResponse(c);
    }
  }
}

/**
 * If its a Function then call it with context
 */
function callIfFn(thing, context) {
  if (_.isFunction(thing)) {
    return thing(context);
  }

  return thing;
}
