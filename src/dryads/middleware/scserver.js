import * as _  from 'underscore';

/**
 * Send OSC to the SuperCollider server (scsynth)
 *
 * Command may have one of these three forms:
 *
 * msg: Array
 *
 * bundle: {
 *   time: null|Number|Array|Date
 *   packets: Array
 * }
 *
 * callAndResponse: {call: response: }
 *
 * Alternatively you may supply a function that is called with context
 * and returns one of these three forms.
 *
 * Bundle time format
 */
export default function scserver(commands) {
  let promises = [];
  commands.forEach((commandContext) => {
    let command = commandContext.command;
    let context = commandContext.context;

    if (command.scserver) {
      if (command.scserver.msg) {
        let m = callIfFn(command.scserver.msg, context);
        context.scserver.send.bundle(0.03, [m]);
      }
      if (command.scserver.bundle) {
        let b = callIfFn(command.scserver.bundle, context);
        context.scserver.send.bundle(b.time, b.packets);
      }
      if (command.scserver.callAndResponse) {
        let c = callIfFn(command.scserver.callAndResponse, context);
        promises.push(context.scserver.callAndResponse(c));
      }
    }
  });
  return Promise.all(promises);
};

/**
 * If its a Function then call it with context
 */
function callIfFn(thing, context) {
  if (_.isFunction(thing)) {
    return thing(context);
  }
  return thing;
}
