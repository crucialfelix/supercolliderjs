# supercolliderjs
[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

<i>JavaScript library for the SuperCollider music language and synthesis server</i>

`supercollider.js` is a full-featured, batteries included client library for the `SuperCollider` audio synthesis server and the SuperCollider language interpreter.

It can be used for algorithmic composition, live coding, playing sounds with MIDI, audio processing, sound file rendering, data sonification and more.

It is written in TypeScript and compiled for release as ES2018 (Node >= 10) JavaScript and can be used in Node applications for either JavaScript or TypeScript.

<aside class="aside">
<h3>SuperCollider</h3>

SuperCollider is a platform for audio synthesis and algorithmic composition, used by musicians, artists, and researchers working with sound. It is free and open source software available for Windows, Mac OS X, and Linux. <a href="https://supercollider.github.io/" target="_blank">supercollider.github.io</a>

It consists of two parts:

- `scsynth`: A real-time audio synthesis Server that communicates over TCP/IP using the OSC (Open Sound Control) protocol.
  - High quality accurate and efficient audio engine
  - Fully adjustable sample rate (192k+) and block size
  - 32-bit float signal chain
  - Sampling buffers use 64-bit float
  - Fast and fluid control rate modulation
  - [250 Unit generators in SuperCollider](http://doc.sccode.org/Guides/Tour_of_UGens.html)
  - Hundreds more community contributed UGens
  - Simple ANSI C plugin API
  - Supports any number of input and output channels, ideal for large multichannel setups
  - macOS, linux, windows

- `sclang`: An interpreter and runtime for the SuperCollider programming language. It is similar to Smalltalk or Ruby with syntax similar to C or Javascript.
</aside>

## Install

1. Install SuperCollider:
  https://supercollider.github.io/

2. Install supercolliderjs:
```shell
npm install supercolliderjs
```

## Examples


There are several interfaces, ranging from low-level (tedious, error-prone) control to higher level constructs.

```js
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

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/server-plus.js>source</a></small>



### SynthDef and Synth

A SuperCollider SynthDef defines a graph of [Unit generators](https://en.wikipedia.org/wiki/Unit_generator). It wires together inputs and outputs, oscillators and filters. Once it is compiled and sent to the server, then you can create Synths that play that sound.

Currently supercollider.js uses `sclang` to compile synth defs. Full support for writing and compiling SynthDefs from JavaScript is planned.

```js
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

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/synthdef-and-synth.js>source</a></small>


```js
const sc = require("supercolliderjs");

sc.server.boot().then(server => {
  const def = server.synthDef(
    "bubbles",
    `
      SynthDef("bubbles", { arg out=0, wobble=0.4, innerWobble=8, releaseTime=4;
        var f, zout;
        f = LFSaw.kr(wobble, 0, 24, LFSaw.kr([innerWobble, innerWobble / 1.106], 0, 3, 80)).midicps;
        zout = CombN.ar(SinOsc.ar(f, 0, 0.04), 0.2, 0.2, 4);  // echoing sine wave
        zout = zout * EnvGen.kr(Env.linen(releaseTime: releaseTime), doneAction: 2);
        Out.ar(out, zout);
      });
    `,
  );

  setInterval(() => {
    server.synth(def, {
      wobble: Math.random() * 10,
      innerWobble: Math.random() * 16,
      releaseTime: Math.random() * 4 + 2,
    });
  }, 4000);
});

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/bubbles.js>source</a></small>


[Server Plus](./packages/server-plus/README.md)
[Server](./packages/server/README.md)

### lang

- Spawns the language interpreter, `sclang`
- Call SuperCollider code from JavaScript

```js
const sc = require("supercolliderjs");

sc.lang.boot().then(async function(lang) {
  // This function is declared as `async`
  // so for any function calls that return a Promise we can `await` the result.

  // This is an `async` function, so we can `await` the results of Promises.
  const pyr8 = await lang.interpret("(1..8).pyramid");
  console.log(pyr8);

  const threePromises = [16, 24, 32].map(n => {
    return lang.interpret(`(1..${n}).pyramid`);
  });

  // `interpret` many at the same time and wait until all are fulfilled.
  // Note that `lang` is single threaded,
  // so the requests will still be processed by the interpreter one at a time.
  const pyrs = await Promise.all(threePromises);
  console.log(pyrs);

  // Get a list of all UGen subclasses
  const allUgens = await lang.interpret("UGen.allSubclasses");

  // Post each one to STDOUT
  allUgens.forEach(ugenClass => console.log(ugenClass));

  await lang.quit();
});

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/lang-interpret.js>source</a></small>


Documentation
-------------

[Documentation](https://crucialfelix.github.io/supercolliderjs/#/packages/supercolliderjs/api)

Compatibility
-------------

Works on Node 10+

Source code is written in TypeScript and is usable in JavaScript [es2018](https://2ality.com/2017/02/ecmascript-2018.html) or [TypeScript](https://www.typescriptlang.org/docs/home.html) projects.

Contribute
----------

- Issue Tracker: https://github.com/crucialfelix/supercolliderjs/issues
- Source Code: https://github.com/crucialfelix/supercolliderjs

License
-------

MIT license

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE

[npm-url]: https://npmjs.org/package/supercolliderjs
[npm-version-image]: http://img.shields.io/npm/v/supercolliderjs.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/supercolliderjs.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
