[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url] [![Dependency Status](https://david-dm.org/@supercollider/server.svg)](https://david-dm.org/@supercollider/server)

# @supercollider/server

Client library for the SuperCollider scsynth audio engine.

Starts a `scsynth` server as a child process.
Sends and receives OSC messages to the server.
Manages allocation of node and buffer resources.

## Server - scsynth
- High quality accurate and efficient audio engine
- Fully adjustable sample rate (192k+) and block size
- 32-bit float signal chain
- Sampling buffers use 64-bit float
- Fast and fluid control rate modulation
- Communicates via Open Sound Control - TCP/UDP network communication
- Hundreds of UGens (unit generators)
- Simple ANSI C plugin API
- Hundreds more community contributed UGens
- Supports any number of input and output channels, ideal for large multichannel setups
- Multi-processor support using the Supernova server implementation

## Usage

```js
import Server from "@supercollider/server";

let s = new Server();
s.boot().then(async () => {
  s.synth
});
```

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

[npm-url]: https://npmjs.org/package/@supercollider/server
[npm-version-image]: http://img.shields.io/npm/v/@supercollider/server.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/@supercollider/server.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
