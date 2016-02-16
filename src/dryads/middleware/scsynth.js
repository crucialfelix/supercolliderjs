
/**
 * Send OSC to scsynth
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
export default function scsynth(commands) {
  let promises = [];
  commands.forEach((commandContext) => {
    let command = commandContext.command;
    let context = commandContext.context;

    if (command.scsynth) {
      if (command.scsynth.msg) {
        let m = command.scsynth.msg(context);
        // context.scsynth.send.msg(m);
        context.scsynth.send.bundle(0.03, [m]);
      }
      if (command.scsynth.bundle) {
        let b = command.scsynth.bundle(context);
        context.scsynth.send.bundle(b.time, b.packets);
      }
      if (command.scsynth.callAndResponse) {
        let c = command.scsynth.callAndResponse(context);
        promises.push(context.scsynth.callAndResponse(c));
      }
    }
  });
  return Promise.all(promises);
};
