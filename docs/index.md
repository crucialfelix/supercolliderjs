---
layout: page
title: Introduction
order: 1
---

supercollider.js is a Node.js library for communicating with and controlling SuperCollider.

SuperCollider is a platform for audio synthesis and algorithmic composition, used by musicians, artists, and researchers working with sound. It is free and open source software available for Windows, Mac OS X, and Linux.

SuperCollider consists of two executables: `scsynth` and `sclang`.

## scsynth

A real-time audio server. It features 400+ unit generators ("UGens") for analysis, synthesis, and processing. Some of the audio techniques it supports include additive synthesis, subtractive, FM, granular, FFT, and physical modelling. You can write your own UGens in C++, and users have already contributed several hundred more in the sc3-plugins repository.

supercollider.js can communicate fluidly with it:

```javascript
let sc = require('supercolliderjs');

sc.server.boot().then((server) => {

  // Compile synthDef from a file
  // Will recompile and send to server if the file changes.
  let def = server.loadSynthDef('formant', './formant.scd');

  // Create group at the root
  let group = server.group();

  let freqSpec = {
    minval: 100,
    maxval: 8000,
    warp: 'exp'
  };

  // Map 0..1 to an exponential frequency range from 100..8000
  let randFreq = () => sc.map.mapWithSpec(Math.random(), freqSpec);

  let spawn = (dur) => {
    server.synth(def, {
      fundfreq: randFreq(),
      formantfreq: randFreq(),
      bwfreq: randFreq(),
      pan: sc.map.linToLin(0, 1, -1, 1, Math.random()),
      timeScale: dur
    }, group);

    let next = Math.random() * 0.25;
    // Schedule this function again:
    setTimeout(() => spawn(next), next * 1000);
  };

  spawn(Math.random());
});
```

- Send and receive OSC messages
- Comprehensive low-level support for calling all commands the server understands
- Call async commands on the server and receive results as Promises
- Synth/Group/Bus/Buffer allocators with clean immutable state implementation
- Server state and synth/group tracking
- Just-in-time OSC scheduler
- Codebase written with Flow type checking
- High unit test coverage

Coming soon:

- Compile SynthDefs in JavaScript


## sclang

SuperCollider language is an interpreted programming language similar to Smalltalk or Ruby with syntax similar to C or Javascript. The interpreter itself is called `sclang`. It communicates with `scsynth` via <abbr title="Open Sound Control">OSC</abbr>. You can use `sclang` for algorithmic sequencing, connecting your app to external hardware including MIDI controllers, or writing GUIs and visual displays. sclang is extensible via the Quarks package system.

Interpreting SuperCollider language code from JavaScript:

```javascript
var sc = require('supercolliderjs');

sc.lang.boot().then(function(sclang) {

  sclang.interpret('(1..8).pyramid')
    .then(function(result) {
      // Result is a native JavaScript array
      console.log('= ' + result);
    }, function(error) {
      // syntax or runtime errors are returned as JavaScript objects
      console.error(error);
    });

  sclang.executeFile('./some-document.scd')
    .then((result) => {
      // Loads and executes the document.
      // The last thing in the source file is returned, converted to equivalent JavaScript types where possible.
    }, console.error);

}, function(error) {
  console.error(error)
  // sclang failed to startup:
  // - executable may be missing
  // - class library may have failed with compile errors
});
```
