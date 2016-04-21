import * as _  from 'underscore';

/**
 * Send OSC to the SuperCollider server (scsynth)
 *
 * Command may have one of these forms:
 *
 * msg: Array
 *
 * bundle: {
 *   time: null|Number|Array|Date
 *   packets: Array of OSC messages
 * }
 *
 * callAndResponse: {
 *   call:
 *   response:
 * }
 *
 * sched: [
 *   {
 *     time: null|Number|Array|Date
 *     messages: Array of OSC messages
 *   }
 * ]
 *
 * (sched will later use a just-in-time scheduler)
 *
 * Alternatively you may supply a function that is called with context
 * and returns one of these forms.
 *
 * Bundle time format
 */
export default function scserver(command, context) {
  if (command.scserver) {
    if (command.scserver.msg) {
      let m = callIfFn(command.scserver.msg, context);
      context.scserver.send.bundle(0.03, [m]);
    }
    if (command.scserver.bundle) {
      let b = callIfFn(command.scserver.bundle, context);
      context.scserver.send.bundle(b.time, b.packets);
    }
    if (command.scserver.sched) {
      // {time: packets}
      // or
      // [{time: packets}, ]
      let b = callIfFn(command.scserver.sched, context);
      if (_.isArray(b)) {
        b.forEach((bb) => context.scserver.send.bundle(bb.time, bb.packets));
        // tried to send them all in a single osc bundle
        // but it seems to silently choke
        // let bundle = {
        //   timeTag: 0.03,
        //   packets: []
        // };
        // b.forEach((subBundle) => {
        //   bundle.packets.push({
        //     timeTag: subBundle.time,
        //     packets: subBundle.packets
        //   });
        // });
        // context.scserver.send.bundle(bundle.timeTag, bundle.packets);
      } else {
        context.scserver.send.bundle(b.time, b.packets);
      }
      if (command.scserver.callAndResponse) {
        let c = callIfFn(command.scserver.callAndResponse, context);
        return context.scserver.callAndResponse(c);
      }
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
