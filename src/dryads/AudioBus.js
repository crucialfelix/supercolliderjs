
import {Dryad} from 'dryadic';

/**
  * Allocates an audio bus, making it available in the children's context as .out (integer)
  * and .numChannels (integer)
  */
export default class AudioBus extends Dryad {

  defaultProperties() {
    return {
      numChannels: 1
    };
  }

  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent() {
    return 'SCServer';
  }

  prepareForAdd() {
    return {
      out: (context) => context.scserver.state.allocAudioBus(this.properties.numChannels),
      numChannels: this.properties.numChannels
    };
  }

  remove() {
    return {
      run: (context) => context.scserver.state.freeAudioBus(context.out, this.properties.numChannels)
    };
  }
}
