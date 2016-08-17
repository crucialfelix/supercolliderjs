
var sc = require('../index.js');

function saw(children) {
  return ['scsynthdef', {
    source: `
      SynthDef("saw", { arg freq;
        Out.ar(0, EnvGen.kr(Env.perc, doneAction: 2) * Saw.ar(freq))
      });
    `
  }, children];
}

function synthEventList() {
  return [
    'syntheventlist', {
      events: [
        {
          time: 0,
          defName: 'saw',
          args: {
            freq: 440
          }
        },
        {
          time: 2,
          defName: 'saw',
          args: {
            freq: 880
          }
        }
      ],
      loopTime: 4
    }
  ];
}

sc.play(['scserver', {}, [
    saw([synthEventList()])
  ]
]);
