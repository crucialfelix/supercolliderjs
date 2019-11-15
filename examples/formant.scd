
// Used in group.js and bus.js examples
Spec.specs.put(\fundfreq, ControlSpec.new(40, 10240, 'exp', 0, 0));
Spec.specs.put(\formantfreq, ControlSpec.new(40, 10240, 'exp', 0, 0));
Spec.specs.put(\bwfreq, ControlSpec.new(40, 10240, 'exp', 0, 0));

SynthDef(\formant, { arg out=0, fundfreq=440, formantfreq=440, bwfreq=100, timeScale=1, pan=0;
  var saw, envd, panned;

  saw = Formant.ar(fundfreq, formantfreq, bwfreq);

  envd = saw * EnvGen.kr(Env.sine(0.1, 0.2), timeScale: timeScale, doneAction: 2);
  panned = Pan2.ar(envd * AmpCompA.kr(fundfreq, 0.2, 0.7), pan);

  OffsetOut.ar(out, panned);
}).add;
