# @supercollider/server
[![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url]

<i>Client library for the SuperCollider scsynth audio engine</i>

## scsynth features

`scsynth` is SuperCollider's synthesis server.

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


## @supercollider/server Features

This package supports all the core functionality for working with `scsynth`:

- Spawns the synthesis server, `scsynth` as a subprocess
- Send and receive OSC messages
- Comprehensive support for constructing and sending all commands the server understands
- Call async commands on the server and receive results as Promises
- Synth/Group/Bus/Buffer allocators with clean immutable state implementation
- Immutable server state and synth/group tracking
- Just-in-time OSC scheduler

**You can install this lib separately from supercolliderjs, but currently to compile SynthDefs you need to write them in SuperCollider code and use `@supercollider/lang` to compile those.**



# Examples

Server low level API

```js
const sc = require('supercolliderjs');

sc.server.boot().then(async server => {

  // Really low level, using explicit hard coded node ids
  // and manually building the message.
  // You don't want to do this.
  server.send.msg('/g_new', [ 9999 ] );

  // Use node id allocator and OSC message constructors.
  // Still tedidous and error prone.
  // No notification of when the group is created on the server.
  const groupNodeID = server.state.nextNodeID();
  server.send.msg(sc.server.msg.groupNew(groupNodeID));

  // @supercollider/server-plus adds these methods:
  // Create a group and wait for confirmation. Nice and simple
  const group = await server.group();

});
```

The `@supercollider/server-plus` package extends the `Server` class, adding extra methods. It is one way of working. `@supercollider/dryads` are another higher level api for working.

You can also build your own way of working if you like—all the packages expose low level functions so you can reuse them in different projects.


## API

- [boot](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/modules/_server_.html#boot)
    Start the server process and connect to it.
    ```js
      // options: ServerArgs
     sc.server.boot({device: 'Soundflower (2ch)'});
    ```

- [ServerArgs](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/modules/_options_.html#serverargs)
    This is the union of [ServerSettings](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/interfaces/_options_.serversettings.html) and [ScsynthArgs](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/interfaces/_options_.scsynthargs.html)

- [Server](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/classes/_server_.server.html)
  ```js
  // options: ServerArgs
  const server = new sc.server.Server(options);
  ```

  - [boot](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/classes/_server_.server.html#boot)
    Starts the server process scsynth and establish a pipe connection to receive stdout and stderr.
    Does not connect, so UDP is not yet ready for OSC communication.

  - [connect](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/classes/_server_.server.html#connect)
    Establish connection to scsynth via OSC socket
  - [send](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/classes/_internals_sendosc_.sendosc.html)
    ```js
    server.send.msg('/s_new', ['defName', 440]);
    server.send.bundle(0.05, [
      ['/s_new', 'defName', 440],
      ['/s_new', 'defName', 880],
    ]);
    ```
  - receive
    A subscribeable stream of OSC events received.
    ```js
    server.receive.subscribe(function(msg) {
      console.log(msg);
    });
    ```
  - callAndResponse

    Send an OSC command that expects a reply from the server, returning a Promise that resolves with the response.

    This is for getting responses async from the server. The first part of the message matches the expected args, and the rest of the message contains the response.

    ```js
      await server.callAndResponse(sc.server.msg.defLoadDir("./synthdefs/"));
    ```
  - stdout
    A subscribeable stream of STDOUT printed by the scsynth process.
    ```js
    server.stdout.subscribe(function(msg) {
      console.log(msg);
    });
    ```
  - quit
    ```js
    await server.quit();
    ```


- [msg](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/modules/_osc_msg_.html)
    Functions for building all OSC messages for `scsynth`.
- [mapping](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/modules/_mapping_.html)
  Frequently used musical mapping functions ported from SuperCollider.
- [ServerState](https://crucialfelix.github.io/supercolliderjs/packages/server/docs/classes/_serverstate_.serverstate.html)
  Holds internal state for a Server such as node/bus/buffer allocators, node status and SynthDefs that have been compiled and sent.
  Server has this has as the property: server.state

  Many of these functions are low-level accessors and allocators useful for building higher-level applications that are easier to use.

  Each server is stored by its unique address, so multiple Servers can store state in the same global Store object.

  This is where all state is stored for node, buffer and bus allocators, as well
  as node state tracking (is a Synth playing or not). The nice thing about this design is that the new state is only committed if no Exception is thrown.

Documentation
-------------

[Documentation](https://crucialfelix.github.io/supercolliderjs/#/packages/server/api)

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
