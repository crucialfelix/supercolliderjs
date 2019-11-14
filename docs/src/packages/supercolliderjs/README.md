{{> header}}

`supercollider.js` is a full-featured, batteries included client library for the `SuperCollider` audio synthesis server and the SuperCollider language interpreter.

It can be used for algorithmic composition, live coding, playing sounds with MIDI, audio processing, sound file rendering, data sonification and more.

It is written in TypeScript and compiled for release as ES2018 (Node >= 10) JavaScript and can be used in Node applications for either JavaScript or TypeScript.

<aside class="aside">
<h3>SuperCollider</h3>

SuperCollider is a platform for audio synthesis and algorithmic composition, used by musicians, artists, and researchers working with sound. It is free and open source software available for Windows, Mac OS X, and Linux. <a href="https://supercollider.github.io/" target="_blank">supercollider.github.io</a>

It consists of two parts:

- `scsynth`: A real-time audio synthesis Server that communicates over TCP/IP using the OSC (Open Sound Control) protocol.
  - High quality accurate and efficient audio engine
  - Fully adjustable sample rate (192k+) and block size
  - 32-bit float signal chain
  - Sampling buffers use 64-bit float
  - Fast and fluid control rate modulation
  - [250 Unit generators in SuperCollider](http://doc.sccode.org/Guides/Tour_of_UGens.html)
  - Hundreds more community contributed UGens
  - Simple ANSI C plugin API
  - Supports any number of input and output channels, ideal for large multichannel setups
  - macOS, linux, windows

- `sclang`: An interpreter and runtime for the SuperCollider programming language. It is similar to Smalltalk or Ruby with syntax similar to C or Javascript.
</aside>

## Install

1. Install SuperCollider:
  https://supercollider.github.io/

2. Install supercolliderjs:
```shell
npm install supercolliderjs
```

## Examples


There are several interfaces, ranging from low-level (tedious, error-prone) control to higher level constructs.

{{#example}}examples/server-plus.js{{/example}}


### SynthDef and Synth

A SuperCollider SynthDef defines a graph of [Unit generators](https://en.wikipedia.org/wiki/Unit_generator). It wires together inputs and outputs, oscillators and filters. Once it is compiled and sent to the server, then you can create Synths that play that sound.

Currently supercollider.js uses `sclang` to compile synth defs. Full support for writing and compiling SynthDefs from JavaScript is planned.

{{#example}}examples/synthdef-and-synth.js{{/example}}

{{#example}}examples/bubbles.js{{/example}}

[Server Plus](./packages/server-plus/README.md)
[Server](./packages/server/README.md)

### lang

- Spawns the language interpreter, `sclang`
- Call SuperCollider code from JavaScript

{{#example}}examples/lang-interpret.js{{/example}}

{{> footer }}
