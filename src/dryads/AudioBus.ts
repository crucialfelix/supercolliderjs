import { Dryad } from "dryadic";
import Server from "../server/server";

interface Properties {
  numChannels: number;
}
interface Context {
  scserver: Server;
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

  prepareForAdd(): object {
    return {
      callOrder: "SELF_THEN_CHILDREN",
      updateContext: (context: Context, properties: Properties) => ({
        out: context.scserver.state.allocAudioBus(properties.numChannels),
        numChannels: properties.numChannels,
      }),
    };
  }

  remove(): object {
    return {
      run: (context: Context, properties: Properties) =>
        context.scserver.state.freeAudioBus(context.out, properties.numChannels),
    };
  }
}
