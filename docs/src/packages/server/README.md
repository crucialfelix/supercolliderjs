{{> header}}

## scsynth features

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

- Spawns the synthesis server, `scsynth` as a subprocess
- Send and receive OSC messages
- Comprehensive support for sending all commands the server understands
- Call async commands on the server and receive results as Promises
- Synth/Group/Bus/Buffer allocators with clean immutable state implementation
- Immutable server state and synth/group tracking
- Just-in-time OSC scheduler

You can install just this lib, but to compile SynthDefs you need to use sclang. SynthDefs and UGens are a planned upcoming feature.

# Examples

TODO link to main examples page.
note that server-plus offers the convienience

config and paths


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

  // Create a group and wait for confirmation. Nice and simple
  const group = await server.group();

  // create a group, allocating a nodeid
  // create a synth, allocating a nodeid
  // allocate a bus
  // set value on a bus
});
```

subscribing to internal events


{{> footer }}