// @supercollider/server-plus interface
const sc = require("supercolliderjs");

sc.server.boot().then(async server => {
  // Compile a SynthDef from inline SuperCollider language code and send it to the server
  const def = await server.synthDef(
    "formant",
    `{ |out=0, fundfreq=440, formantfreq=440, bwfreq=100, timeScale=1, pan=0|
        var saw, envd, panned;

        saw = Formant.ar(fundfreq, formantfreq, bwfreq);

        envd = saw * EnvGen.kr(Env.sine(0.1, 0.2), timeScale: timeScale, doneAction: 2);
        panned = Pan2.ar(envd * AmpCompA.kr(fundfreq, 0.2, 0.7), pan);

        OffsetOut.ar(out, panned);
      }`,
  );

  // Create group at the root
  const group = server.group();

  const freqSpec = {
    minval: 100,
    maxval: 8000,
    warp: "exp",
  };

  // Map 0..1 to an exponential frequency range from 100..8000
  const randFreq = () => sc.map.mapWithSpec(Math.random(), freqSpec);

  // function to spawn one synth event
  const spawn = dur => {
    server.synth(
      def,
      {
        fundfreq: randFreq(),
        formantfreq: randFreq(),
        bwfreq: randFreq(),
        pan: sc.map.linToLin(0, 1, -1, 1, Math.random()),
        timeScale: dur,
        // spawn each synth into the same group
      },
      group,
    );

    const next = Math.random() * 0.25;

    // Schedule this function again:
    setTimeout(() => spawn(next), next * 1000);
  };

  // spawn the first event
  spawn(Math.random());
}, console.error);
