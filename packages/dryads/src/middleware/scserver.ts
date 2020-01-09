import _ from "lodash";
import OSCSched from "./OSCSched";
import Server, { msg } from "@supercollider/server";
import { Middleware, UpdateContext, Command, Context } from "dryadic";

interface Properties {}
interface ServerContext extends Context {
  oscSched?: any;
  epoch?: number;
  scserver: Server;
}
interface ServerCommand extends Command {
  scserver?: {
    // thing or Promise for thing
    msg?: any;
    bundle?: any;
    schedLoop?: any;
    callAndResponse?: msg.CallAndResponse;
  };
}

/**
 * Command middlware that sends OSC to the SuperCollider server (scsynth).
 *
 * Command objects are collected from each Dryad (`add()` `remove()`) and
 * this middlware is called for each Dryad that has `scserver` commands.
 *
 * @param {object} command
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
 *  Call and response object creator functions can be found in `osc/msg`
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
 */
export const scserver: Middleware = async (
  command: ServerCommand,
  context: Context,
  properties: Properties,
  updateContext: UpdateContext,
): Promise<void> => {
  if (command.scserver) {
    // Assuming that it really conforms to ServerContext.
    const ctx = context as ServerContext;
    const cmds = resolveFuncs(command.scserver, ctx, properties);

    // send a single OSC message
    if (cmds.msg) {
      // TODO get default latency from ctx
      // TODO: should collect all messages into one bundle, in order
      ctx.scserver.send.bundle(0.05, [cmds.msg]);
    }

    // send an OSC bundle
    if (cmds.bundle) {
      ctx.scserver.send.bundle(cmds.bundle.time, cmds.bundle.packets);
    }

    // schedule events using a schedLoop function
    if (cmds.schedLoop) {
      // initialize the scheduler on first use
      let oscSched = ctx.oscSched;
      if (!oscSched) {
        const sendFn = (time, packets) => ctx.scserver.send.bundle(time, packets);
        oscSched = new OSCSched(sendFn);
        updateContext(context, { oscSched });
      }

      oscSched.schedLoop(cmds.schedLoop, ctx.epoch);
    }

    // Preparation commands that get an OSC callback from the server.
    // These are used only in preparation, not for play / update.
    if (cmds.callAndResponse) {
      await ctx.scserver.callAndResponse(cmds.callAndResponse);
    }
  }
};

export default scserver;

/**
 * Replace any functions in the command object's values with the result of
 * calling the function.
 *
 * eg. msg: (context) => { ... return ['/s_new', ...]; }
 * becomes msg: ['/s_new', ...]
 *
 * Non-functions are passed through.
 */
export function resolveFuncs(command: Command, context: Context, properties: Properties): Command {
  return _.mapValues(command, value => _callIfFn(value, context, properties));
}

/**
 * If its a Function then call it with context and properties
 * @private
 */
function _callIfFn<T = any>(thing: T | Function, context: Context, properties: Properties): T {
  return _.isFunction(thing) ? thing(context, properties) : thing;
}

// T | (context: Context, properties: Properties) => T;
