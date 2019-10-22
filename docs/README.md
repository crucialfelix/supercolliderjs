# supercollider.js

[![Build Status][travis-image]][travis-url] [![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

The JavaScript client library for SuperCollider.

SuperCollider is a real time audio synthesis server that communicates over TCP/IP using the OSC (Open Sound Control) protocol.

## supercolliderjs

This is the full featured, batteries included package.

It includes these lower level packages:

### @supercollider/server

- Spawns the synthesis server, `scsynth`
- Send and receive OSC messages
- Comprehensive support for sending all commands the server understands
- Call async commands on the server receive results as Promises
- Synth/Group/Bus/Buffer allocators with clean immutable state implementation
- Immutable server state and synth/group tracking
- Just-in-time OSC scheduler

### @supercollider/server-plus

This extends the `Server` class adding methods for commonly used constructs.

- .synth
- .group
- .synthDefs
- .loadSynthDef
- .synthDef
- .buffer
- .readBuffer
- .audioBus
- .controlBus

```javascript
let sc = require('supercolliderjs');

// When you import server from supercolliderjs you actually get a ServerPlus
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

### @supercollider/dryads

### @supercollider/lang

SuperCollider is also a programming language and interpreter. This package enables calling SuperCollider code from JavaScript.

- Spawns the language interpreter, `sclang`


```js
var sc = require('supercolliderjs');

sc.lang.boot().then(function(sclang) {

  sclang.interpret('(1..8).pyramid')
    .then(function(result) {
      // result is a native javascript array
      console.log('= ' + result);
    }, function(error) {
      // syntax or runtime errors
      // are returned as javascript objects
      console.error(error);
    });

}, function(error) {
  console.error(error)
  // sclang failed to startup:
  // - executable may be missing
  // - class library may have failed with compile errors
});
```

### @supercollider/osc

- Packs OSC messages and bundles into node `Buffer` for sending
- Unpacks received OSC messages and bundles from node `Buffer`

### @supercollider/scapi


It provides an interpreted object-oriented language which functions as a network client to a state of the art, realtime sound synthesis server.

This library provides functionality for working with:

- scsynth (the synthesis server)
- sclang (supercollider language interpreter)


## Documentation

[API](https://crucialfelix.github.io/supercolliderjs/api/)
[Guide](https://crucialfelix.gitbooks.io/supercollider-js-guide/content/)

## Features

- Send and receive OSC messages
- Comprehensive support for calling all commands the server understands
- Call async commands on the server receive results as Promises
- Synth/Group/Bus/Buffer allocators with clean immutable state implementation
- Server state and synth/group tracking
- Just-in-time OSC scheduler
- Codebase written with Flow (type checking)
- High unit test coverage

- Dryadic: declarative DSL for managing component trees.

## Examples

See also the [Examples Repository](https://github.com/crucialfelix/supercolliderjs-examples).



Compatibility
-------------

Works on Node 10+

Source code is written in TypeScript and published for usage in with either JavaScript or TypeScript.


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
