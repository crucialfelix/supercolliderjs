{{> header}}

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

- {{#typedocLink}}boot:/packages/server/docs/modules/_server_.html#boot{{/typedocLink}}
    Start the server process and connect to it.
    ```js
      // options: ServerArgs
     sc.server.boot({device: 'Soundflower (2ch)'});
    ```

- {{#typedocLink}}ServerArgs:/packages/server/docs/modules/_options_.html#serverargs{{/typedocLink}}
    This is the union of {{#typedocLink}}ServerSettings:/packages/server/docs/interfaces/_options_.serversettings.html{{/typedocLink}} and {{#typedocLink}}ScsynthArgs:/packages/server/docs/interfaces/_options_.scsynthargs.html{{/typedocLink}}

- {{#typedocLink}}Server:/packages/server/docs/classes/_server_.server.html{{/typedocLink}}
  ```js
  // options: ServerArgs
  const server = new sc.server.Server(options);
  ```

  - {{#typedocLink}}boot:/packages/server/docs/classes/_server_.server.html#boot{{/typedocLink}}
    Starts the server process scsynth and establish a pipe connection to receive stdout and stderr.
    Does not connect, so UDP is not yet ready for OSC communication.

  - {{#typedocLink}}connect:/packages/server/docs/classes/_server_.server.html#connect{{/typedocLink}}
    Establish connection to scsynth via OSC socket
  - {{#typedocLink}}send:/packages/server/docs/classes/_internals_sendosc_.sendosc.html{{/typedocLink}}
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


- {{#typedocLink}}msg:/packages/server/docs/modules/_osc_msg_.html{{/typedocLink}}
    Functions for building all OSC messages for `scsynth`.
- {{#typedocLink}}mapping:/packages/server/docs/modules/_mapping_.html{{/typedocLink}}
  Frequently used musical mapping functions ported from SuperCollider.
- {{#typedocLink}}ServerState:/packages/server/docs/classes/_serverstate_.serverstate.html{{/typedocLink}}
  Holds internal state for a Server such as node/bus/buffer allocators, node status and SynthDefs that have been compiled and sent.
  Server has this has as the property: server.state

  Many of these functions are low-level accessors and allocators useful for building higher-level applications that are easier to use.

  Each server is stored by its unique address, so multiple Servers can store state in the same global Store object.

  This is where all state is stored for node, buffer and bus allocators, as well
  as node state tracking (is a Synth playing or not). The nice thing about this design is that the new state is only committed if no Exception is thrown.

{{> footer }}