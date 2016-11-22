# supercollider.js

[![Build Status][travis-image]][travis-url] [![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url] [![Dependency Status](https://david-dm.org/crucialfelix/supercolliderjs.svg)](https://david-dm.org/crucialfelix/supercolliderjs) [![devDependency Status](https://david-dm.org/crucialfelix/supercolliderjs/dev-status.svg)](https://david-dm.org/crucialfelix/supercolliderjs#info=devDependencies)

The JavaScript client library for SuperCollider.

SuperCollider is an environment and programming language for real time audio synthesis and algorithmic composition. It provides an interpreted object-oriented language which functions as a network client to a state of the art, realtime sound synthesis server.

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

### language

Interpret SuperCollider language code.

```javascript
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

### server

```javascript
let sc = require('supercolliderjs');

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


Compatibility
-------------

Works on Node 4+

Source code is written in ES2015 with Flow type annotations.


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
