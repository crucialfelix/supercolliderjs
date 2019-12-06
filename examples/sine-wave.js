const { SCLang, SCServer, Synth, dryadic } = require("supercolliderjs").dryads;

/**
 * Minimal Sin wave example.
 *
 * To compile the SuperCollider language synth def it requires a
 * SCLang. To play the Synth it requires a SCServer.
 */
const out = new SCLang({}, [
  new SCServer({}, [
    Synth.fromSource(`|freq| SinOsc.ar(freq)`, {
      freq: 440,
    }),
  ]),
]);

dryadic(out).play();
