# @supercollider/server-plus
[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

<i>Server class with added methods for Group, Synth and SynthDef creation</i>

This extends the `Server` class from `@supercollider/server`, adding methods for commonly used constructs.


Each method returns a Promise that resolves when the resource is successfully created. Each method accepts Promises as arguments.

```js
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

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/server-plus-promises.js>source</a></small>


## synth
Spawn a synth
```js
synth(
    synthDef: SynthDef,
    args: Params = {},
    group?: Group,
    addAction: number = msg.AddActions.TAIL,
  ): Promise<Synth>;
```

## group
A collection of other nodes organized as a linked list. The
Nodes within a Group may be controlled together, and may be both Synths and
other Groups. Groups are thus useful for controlling a number of nodes at once,
and when used as targets can be very helpful in controlling order of execution.

```js
group(group?: Group, addAction: number = msg.AddActions.TAIL): Promise<Group>;
```

## synthDefs
Compile multiple SynthDefs either from source or path.
If you have more than one to compile then always use this
as calling `server.synthDef` multiple times will start up
multiple supercollider interpreters. This is harmless, but
very inefficient.

defs - An object with `{defName: spec, ...}` where spec is
an object like `{source: "SynthDef('noise', { ...})"}`
or `{path: "./noise.scd"}`

Returns an object with the synthDef names as keys and Promises as values.
Each Promise will resolve with a SynthDef.
Each Promises can be supplied directly to `server.synth()`

```js
synthDefs(defs: { [defName: string]: SynthDefCompileRequest }): { [defName: string]: Promise<SynthDef> }
```

## loadSynthDef
Load and compile a SynthDef from path and send it to the server.
```js
loadSynthDef(defName: string, path: string): Promise<SynthDef>;
```

## synthDef
Compile a SynthDef from supercollider source code and send it to the server.
```js
synthDef(defName: string, sourceCode: string): Promise<SynthDef>;
```

## buffer
Allocate a Buffer on the server.
```js
buffer(numFrames: number, numChannels = 1): Promise<Buffer>;
```

## audioBus
Allocate an audio bus.
```js
audioBus(numChannels = 1): AudioBus;
```

## controlBus
Allocate a control bus.
```js
controlBus(numChannels = 1): ControlBus;
```

## readBuffer
Allocate a Buffer on the server and load a sound file into it.
Problem: scsynth uses however many channels there are in the sound file,
but the client (sclang or supercolliderjs) doesn't know how many there are.

```js
readBuffer(path: string, numChannels = 2, startFrame = 0, numFramesToRead = -1): Promise<Buffer>;
```


### Kitchen sink

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


Documentation
-------------

[Documentation](https://crucialfelix.github.io/supercolliderjs/#/packages/server-plus/api)

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

[npm-url]: https://npmjs.org/package/@supercollider/server-plus
[npm-version-image]: http://img.shields.io/npm/v/@supercollider/server-plus.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/@supercollider/server-plus.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
