const d = require("supercolliderjs").dryads;

/**
 * This is the full tree required just to play a Sin wave.
 * Dryadic 2 will
 */
const out = new d.SCLang({}, [
  new d.SCServer({ numInputBusChannels: 0 }, [
    new d.Synth({
      def: new d.SCSynthDef({
        source: `
      { arg freq;
        Out.ar(0, SinOsc.ar(freq))
      }`,
      }),
      args: {
        freq: 440,
      },
    }),
  ]),
]);

d.dryadic(out).play();
