import { Dryad, Command, CallOrder } from "dryadic";
import Server from "@supercollider/server";

interface Properties {
  numChannels: number;
}
interface Context {
  // parent
  scserver: Server;
  // state
  out: number;
}

/**
 * Allocates an audio bus, making it available in the children's context as .out (integer)
 * and .numChannels (integer)
 */
export default class AudioBus extends Dryad<Properties> {
  defaultProperties(): Properties {
    return {
      numChannels: 1,
    };
  }

  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent(): string {
    return "SCServer";
  }

  prepareForAdd(): Command {
    return {
      callOrder: CallOrder.SELF_THEN_CHILDREN,
      updateContext: (context: Context, properties: Properties) => ({
        out: context.scserver.state.allocAudioBus(properties.numChannels),
        numChannels: properties.numChannels,
      }),
    };
  }

  remove(): Command {
    return {
      run: (context: Context, properties: Properties) =>
        context.scserver.state.freeAudioBus(context.out, properties.numChannels),
    };
  }
}
