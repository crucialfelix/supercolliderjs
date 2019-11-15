const d = require("supercolliderjs").dryads;

const s = d.Synth(
  `
arg freq;
  Out.ar(0, SinOsc.ar(freq))
`,
  {
    freq: 40,
  },
);

s.play();
