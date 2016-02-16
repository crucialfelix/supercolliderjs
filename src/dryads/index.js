import scserver from './middleware/scserver';

import SCServer from './SCServer';
import SCLang from './SCLang';
import Group from './Group';
import Synth from './Synth';
import AudioBus from './AudioBus';
import SCSynthDef from './SCSynthDef';
import SynthControl from './SynthControl';
import SynthStream from './SynthStream';

// re-export all the Dryad classes
export {
  SCServer,
  SCLang,
  Group,
  Synth,
  AudioBus,
  SCSynthDef,
  SynthControl,
  SynthStream
};

// export the layer for app = dryadic().use(layer)
export const layer = {
  middleware: [
    scserver
  ],
  classes: [
    SCServer,
    SCLang,
    Group,
    Synth,
    AudioBus,
    SCSynthDef,
    SynthControl,
    SynthStream
  ]
};
