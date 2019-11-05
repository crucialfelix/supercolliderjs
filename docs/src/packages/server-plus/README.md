{{> header}}

This extends `@supercollider/server` adding methods for commonly used constructs:

- .synth
- .group
- .synthDefs
- .loadSynthDef
- .synthDef
- .buffer
- .readBuffer
- .audioBus
- .controlBus

[API](./docs/index.html)

conviencie methods: they return promises, and when supplied to other conviencience methods

```js
const sc = require('supercolliderjs');

sc.server.boot().then((server) => {

  // Compile synthDef from a file
  // This will also watch the file and recompile and send to server if the file changes.
  // So you can live code by editing ./formant.scd while the spawn loop
  // below sends events.
  // It returns here a Promise for a SynthDef
  let def = server.loadSynthDef('formant', './formant.scd');


  // Create a group at the root
  // TODO what is a Group
  let group = server.group();

  // TODO inline synthdef with an effect
  //
  let freqSpec = {
    minval: 100,
    maxval: 8000,
    warp: 'exp'
  };

  // Map 0..1 to an exponential frequency range from 100..8000
  let randFreq = () => sc.map.mapWithSpec(Math.random(), freqSpec);

  let spawn = (dur) => {
    server.synth(def, {
      fundfreq: randFreq(),
      formantfreq: randFreq(),
      bwfreq: randFreq(),
      pan: sc.map.linToLin(0, 1, -1, 1, Math.random()),
      timeScale: dur
    }, group);

    let next = Math.random() * 0.25;
    // Schedule this function again:
    setTimeout(() => spawn(next), next * 1000);
  };

  spawn(Math.random());

});
```

{{> footer }}