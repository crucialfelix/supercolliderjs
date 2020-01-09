# @supercollider/logger
[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

<i>Console logging utility for supercollider.js for debugging with color support and special formatting for OSC messages.</i>

This is used internally by other `@supercollider` packages.

## Usage

```js
const Logger = require("@supercollider/logger").default;

const debug = true;
const echo = true;

const log = new Logger(debug, echo);
// Log an error.
log.err("Oh no!");
// Log debugging information but only if this.debug is true
log.dbug({ log: "log", some: 1, context: 2, for: "The problem" });
// Log messages that were sent to stdin or sclang.
log.stdin("1 + 1");
// Log messages that were received from stdout of sclang/scsynth.
log.stdout("2");
// Log messages that were emitted from stderr of sclang/scsynth.
log.stderr("ERROR: ...");
// Log OSC messages sent to scsynth.
log.sendosc({ address: "/ping" });
// Log OSC messages received from scsynth.
log.rcvosc({ value: "pong" });

```
<small class="source-link"><a href=https://github.com/crucialfelix/supercolliderjs/blob/develop/examples/logger.js>source</a></small>


Documentation
-------------

[Documentation](https://crucialfelix.github.io/supercolliderjs/#/packages/logger/api)

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

[npm-url]: https://npmjs.org/package/@supercollider/logger
[npm-version-image]: http://img.shields.io/npm/v/@supercollider/logger.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/@supercollider/logger.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
