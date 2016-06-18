supercollider.js
================

[![Build Status][travis-image]][travis-url] [![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url] [![Dependency Status](https://david-dm.org/crucialfelix/supercolliderjs.svg)](https://david-dm.org/crucialfelix/supercolliderjs) [![devDependency Status](https://david-dm.org/crucialfelix/supercolliderjs/dev-status.svg)](https://david-dm.org/crucialfelix/supercolliderjs#info=devDependencies)

Node.js tools for working with the SuperCollider language and synthesis server.

SuperCollider is an environment and programming language for real time audio synthesis and algorithmic composition. It provides an interpreted object-oriented language which functions as a network client to a state of the art, realtime sound synthesis server.

This library provides functionality for working with:

- scsynth (the synthesis server)
- sclang (supercollider language interpreter)


Documentation
-------------

http://supercolliderjs.readthedocs.org/en/latest/
https://doc.esdoc.org/github.com/crucialfelix/supercolliderjs/

Features
--------

- Start SuperCollider language interpreters (sclang)
- Interpret SuperCollider code from node js and get results or errors returned as equivalent JavaScript types

- Start SuperCollider synthesis servers (scsynth)
- Send and receive OSC messages to scsynth
- Call async commands on scsynth and receive results as Promises
- Comprehensive library for calling all commands the server understands
- Node-id/Bus/Buffer allocators with clean immutable state implementation
- Server state and synth/group tracking

- Dryadic: declarative DSL for managing component trees. Documentation coming in 0.11.0

Example
-------

```javascript
var sc = require('supercolliderjs');

sc.lang.boot()
  .then(function(sclang) {

    sclang.interpret('(1..8).pyramid')
      .then(function(result) {
        // result is a native javascript array
        console.log('= ' + result);
      }, function(error) {
        // syntax or runtime errors
        // are returned as javascript objects
        console.log(error);
      });

  });
```


```javascript
var sc = require('supercolliderjs');

sc.server.boot()
  .then(function(server) {

    // raw send message
    server.send.msg(['/g_new', 1, 0, 0]);

    // using sc.msg to format them
    server.send.msg(sc.msg.groupNew(1));

    // call async messages with callAndResponse
    // and receive replies with a Promise
    server.callAndResponse(sc.msg.status())
      .then(function(reply) {
        console.log(reply);
      });

  });
```



Compatibility
-------------

Works on Node 4+

Source code is written in ES2015 and transpiled with babel.


Contribute
----------

- Issue Tracker: https://github.com/crucialfelix/supercolliderjs/issues
- Source Code: https://github.com/crucialfelix/supercolliderjs


License
-------

The project is licensed under the MIT license.

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE

[npm-url]: https://npmjs.org/package/supercolliderjs
[npm-version-image]: http://img.shields.io/npm/v/supercolliderjs.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/supercolliderjs.svg?style=flat

[travis-url]: http://travis-ci.org/crucialfelix/supercolliderjs
[travis-image]: https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master
