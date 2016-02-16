import scsynth from './middleware/scsynth';

import SCSynth from './SCSynth';
import SCLang from './SCLang';
import Group from './Group';
import Synth from './Synth';
import AudioBus from './AudioBus';
import CompileSynthDef from './CompileSynthDef';
import CompileSynthDefFile from './CompileSynthDefFile';
import SCSynthDef from './SCSynthDef';
import SynthControl from './SynthControl';
import SynthStream from './SynthStream';

// re-export all the Dryad classes
export {
  SCSynth,
  SCLang,
  Group,
  Synth,
  AudioBus,
  CompileSynthDef,
  CompileSynthDefFile,
  SCSynthDef,
  SynthControl,
  SynthStream
};

// export the layer for app = dryadic().use(layer)
export const layer = {
  middleware: [
    scsynth
  ],
  classes: [
    SCSynth,
    SCLang,
    Group,
    Synth,
    AudioBus,
    CompileSynthDef,
    CompileSynthDefFile,
    SCSynthDef,
    SynthControl,
    SynthStream
  ]
};
