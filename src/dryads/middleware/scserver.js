
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
 */
export default function scserver(commands) {
  let promises = [];
  commands.forEach((commandContext) => {
    let command = commandContext.command;
    let context = commandContext.context;

    if (command.scserver) {
      if (command.scserver.msg) {
        let m = command.scserver.msg(context);
        // context.scserver.send.msg(m);
        context.scserver.send.bundle(0.03, [m]);
      }
      if (command.scserver.bundle) {
        let b = command.scserver.bundle(context);
        context.scserver.send.bundle(b.time, b.packets);
      }
      if (command.scserver.callAndResponse) {
        let c = command.scserver.callAndResponse(context);
        promises.push(context.scserver.callAndResponse(c));
      }
    }
  });
  return Promise.all(promises);
};
