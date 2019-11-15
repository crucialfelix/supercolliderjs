const sc = require("supercolliderjs");

sc.server.boot().then(async server => {
  // Compile synthDef from a file, returning a Promise
  const synthDef = server.loadSynthDef("formant", "./formant.scd");

  // Map 0..1 to an exponential frequency range from 100..8000
  const randFreq = () =>
    sc.map.mapWithSpec(Math.random(), {
      minval: 100,
      maxval: 8000,
      warp: "exp",
    });

  const synthPromise = server.synth(
    // The promise will be resolved before the command to create the synth
    // is sent.
    synthDef,
    {
      fundfreq: randFreq(),
      formantfreq: randFreq(),
      bwfreq: randFreq(),
      pan: sc.map.linToLin(0, 1, -1, 1, Math.random()),
    },
  );

  // await a promise to get it's value
  const synth = await synthPromise;

  // This continues execution after the "node is playing" response is received.
  console.log(synth);
});
