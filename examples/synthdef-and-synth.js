const sc = require("supercolliderjs");

sc.server.boot().then(async server => {
  // Compile and send to server from inline SuperCollider code
  const pulse = await server.synthDef(
    "pulse",
    `{ arg out = 0, freq=200;
    Out.ar(out, Pulse.ar(200, Line.kr(0.01,0.99,8), 0.2))
  }`,
  );

  await server.synth(pulse, { freq: 300 });

  // Load and compile from a SuperCollider language file
  const klang = await server.loadSynthDef("klang", "./klang.scd");

  await server.synth(klang);

  // Compile or load many at once
  const defs = await server.synthDefs({
    clipNoise: {
      source: `{ arg out = 0;
        var clip = LFClipNoise.ar(MouseX.kr(200, 10000, 1), 0.125);
        Out.ar(out, clip);
      }`,
    },
    lpf: {
      source: `{ arg in = 0, out = 0;
        var input = In.ar(in);
        var lpf = RLPF.ar(input, MouseY.kr(1e2, 2e4, 1), 0.2, 0.2);
        ReplaceOut.ar(out, lpf);
      }`,
    },
  });

  // Some people pre-compile synth defs to a binary format.
  // Load a pre-compiled synth def from a binary file.
  const defLoadMsg = sc.server.msg.defLoad("./formant.scsyndef");
  // This object has two properties:
  // .call - the OSCMessage to send
  // .response - the expected OSCMessage that the server will reply with
  // Call and wait for the response:
  await server.callAndResponse(defLoadMsg);

  // Load an entire directory of pre-compiled synth defs
  // await server.callAndResponse(sc.server.msg.defLoadDir("./synthdefs/"));
});
