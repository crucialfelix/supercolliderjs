import { Dryad } from "dryadic";

interface Props {
  numChannels: number;
}

/**
 * Allocates an audio bus, making it available in the children's context as .out (integer)
 * and .numChannels (integer)
 */
export default class AudioBus extends Dryad {
  defaultProperties(): Props {
    return {
      numChannels: 1
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
      updateContext: (context, properties: Props) => ({
        out: context.scserver.state.allocAudioBus(properties.numChannels),
        numChannels: properties.numChannels
      })
    };
  }

  remove(): object {
    return {
      run: (context, properties: Props) =>
        context.scserver.state.freeAudioBus(context.out, properties.numChannels)
    };
  }
}
