# `@supercollider.js/server`

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
import server from "@supercollider.js/server";

let s = new Server();

```
