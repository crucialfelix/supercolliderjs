# @supercollider/osc
[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

<i>Open Sound Control packet, bundle and buffer utilities for supercollider</i>

- Packs OSC messages and bundles into a Node `Buffer` for sending
- Unpacks received OSC messages and bundles from a Node `Buffer`

It does not concern itself with network connections.

The OSC support is limited to the types and features of SuperCollider server.
This means it does not support inline arrays `[f]`

This is used internally by `@supercollider/server`

## Usage

```js
const osc = require('@supercollider/osc');

// TODO: DEMONSTRATE API
```

Documentation
-------------

[Documentation](https://crucialfelix.github.io/supercolliderjs/#/packages/osc/api)

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

[npm-url]: https://npmjs.org/package/@supercollider/osc
[npm-version-image]: http://img.shields.io/npm/v/@supercollider/osc.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/@supercollider/osc.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
