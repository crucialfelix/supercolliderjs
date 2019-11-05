# @supercollider/server

Client library for the SuperCollider `scsynth` audio engine.

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

## Implementation

TODO how it is different than sclang's implementation

immutable: when errors happen it doesn't mess up the state.
async await when sending messages

## Usage

config and paths
note about convience methods: server-plus
sending a raw message
using the internal allocator
event

