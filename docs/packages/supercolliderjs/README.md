# supercollider.js

[![Build Status][travis-image]][travis-url] [![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

`supercollider.js` is a full-featured, batteries included client library for the `SuperCollider` audio synthesis server and the SuperCollider language interpreter.

It is written in TypeScript and compiled for release as ES2018 (Node >= 10) JavaScript and can be used in Node applications for either JavaScript or TypeScript.

### SuperCollider

SuperCollider is a platform for audio synthesis and algorithmic composition, used by musicians, artists, and researchers working with sound. It is free and open source software available for Windows, Mac OS X, and Linux. <a href="https://supercollider.github.io/" target="_blank">supercollider.github.io</a>

It consists of two parts:

- `scsynth`: A real-time audio synthesis server that communicates over TCP/IP using the OSC (Open Sound Control) protocol. It is portable, network native and has excellent sound quality.
- `sclang`: A programming language similar to Smalltalk or Ruby with syntax similar to C or Javascript. This is the original reference client for `scsynth`.

## Install

1. Install SuperCollider:
  https://supercollider.github.io/

2. Install supercolliderjs:
```shell
npm install supercolliderjs
```

## Examples

### server


```javascript
const sc = require('supercolliderjs');

sc.server.boot().then((server) => {

  // Compile synthDef from a file
  // Will recompile and send to server if the file changes.
  let def = server.loadSynthDef('formant', './formant.scd');

// Create group at the root
  let group = server.group();

  let freqSpec = {
    minval: 100,
    maxval: 8000,
    warp: 'exp'
  };

  // Map 0..1 to an exponential frequency range from 100..8000
  let randFreq = () => sc.map.mapWithSpec(Math.random(), freqSpec);

  let spawn = (dur) => {
    server.synth(def, {
      fundfreq: randFreq(),
      formantfreq: randFreq(),
      bwfreq: randFreq(),
      pan: sc.map.linToLin(0, 1, -1, 1, Math.random()),
      timeScale: dur
    }, group);

    let next = Math.random() * 0.25;
    // Schedule this function again:
    setTimeout(() => spawn(next), next * 1000);
  };

  spawn(Math.random());

});
```

[Server](./packages/server/README.md) Core functionality, node and buffer id allocators.

[Server Plus](./packages/server-plus/README.md)

Adds methods for

- .synth
- .group
- .synthDefs
- .loadSynthDef
- .synthDef
- .buffer
- .readBuffer
- .audioBus
- .controlBus

### dryads

reason why it's a solution

### lang

- Spawns the language interpreter, `sclang`
- Call SuperCollider code from JavaScript


```js
var sc = require('supercolliderjs');

sc.lang.boot().then(async function(sclang) {

  const pyramid = await sclang.interpret('(1..8).pyramid');
  console.log(pyramid);


}, function(error) {
  console.error(error)
  // sclang failed to startup:
  // - executable may be missing
  // - class library may have failed with compile errors
});
```


## Compatibility

Node 10+

Source code is written in TypeScript and published for usage in with either JavaScript or TypeScript.


## Contribute

- Issue Tracker: https://github.com/crucialfelix/supercolliderjs/issues
- Source Code: https://github.com/crucialfelix/supercolliderjs

## License

MIT license

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE

[npm-url]: https://npmjs.org/package/supercolliderjs
[npm-version-image]: http://img.shields.io/npm/v/supercolliderjs.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/supercolliderjs.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
