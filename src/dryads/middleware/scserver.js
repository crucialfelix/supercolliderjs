import * as _  from 'underscore';
import OSCSched from './OSCSched';

/**
 * Send OSC to the SuperCollider server (scsynth)
 *
 * @param {Object} command
 *
 * Command may have one of these forms:
 *
 * msg: {Array} - OSC message
 *
 * bundle: {
 *   time: null|Number|Array|Date
 *   packets: Array of OSC messages
 * }
 *
 * sched: [
 *   {
 *     time: null|Number|Array|Date
 *     messages: Array of OSC messages
 *   }
 * ]
 *
 * sched uses a just-in-time scheduler, keeping the OSC messages in the node process
 * and only sending them to the server just before they should play. This doesn't overload
 * the server with a glut of messages and also allows cancellation and updating of the messages
 * and makes it easy to implement transport controls and looping.
 *
 * callAndResponse: {
 *   call:
 *   response:
 * }
 *
 * Returns a Promise. Only in preparation, not for play / update.
 *
 * Alternatively for any of these you may supply a function that is called with context
 * and returns one of these forms.
 *
 * Bundle time format
 *
 * @param {Object} context
 * @return {void|Promise}         description
 */
export default function scserver(command, context) {
  if (command.scserver) {
    if (command.scserver.msg) {
      const m = callIfFn(command.scserver.msg, context);
      context.scserver.send.bundle(0.03, [m]);
    }

    if (command.scserver.bundle) {
      const b = callIfFn(command.scserver.bundle, context);
      context.scserver.send.bundle(b.time, b.packets);
    }

    if ((command.scserver.setEpoch || command.scserver.sched) && !context.oscSched) {
      const schedFn = (time, packets) => context.scserver.send.bundle(time, packets);
      context.oscSched = new OSCSched(schedFn, context.epoch || _.now());
    }

    if (command.scserver.setEpoch) {
      context.oscSched.epoch = command.scserver.setEpoch;
    }

    if (command.scserver.sched) {
      const b = callIfFn(command.scserver.sched, context);
      context.oscSched.sched(_.isArray(b) ? b : [b]);
    }

    if (command.scserver.callAndResponse) {
      const c = callIfFn(command.scserver.callAndResponse, context);
      // Only this one returns.
      // These are used only in preparation, not for play / update.
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
