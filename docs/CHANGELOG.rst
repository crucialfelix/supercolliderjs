CHANGELOG
=========

0.9.0
-----

This is the start of a larger build out. Allocators and state storage have been added, but these commands are still a bit low level and "some assembly required".

Features
++++++++

- Allocators for node ids, buffers and busses
- Server state node watcher tracks all node go/end events
- OSC message functions for all server commands
- Server-callAndResponse for async server commands
- SCLang-executeFile
- Reactive JS streams for server events
- Immutable JS for safe and efficient state storage
- map functions for some unique supercollider transforms (midiToFreq, freqToMidi, linToLin, linToExp, expToLin, ampToDb, dbToAmp)
- Full API documentation
- Logging colors now work in browser as well as in terminal
- Moved supercollider code from a script (interpreter.scd) to a dedicated class SuperColliderJS.sc
- added sc.lang.boot() and sc.server.boot()
- compile-synthdefs utility: boots sclang and compiles a file of SynthDefs, saving the compiled defs to a directory. Useful for building projects that don't use sclang and wish to ship pre-compiled SynthDefs.
- export-supercollider utility; not 100% done, but this exports your current supercollider executables, class library and quarks to a folder for use as an isolated stand-alone
- (ALPHA) dryadic components for synth, group, compileSynthDef, etc.
  This are experimental and will be replaced with a new version in 0.10.0

Breaking
++++++++

- Drop support for Node < 4
- Promises have changed from Q to Bluebird, which is an extension of the ES2015 Promise standard. This will probably not affect your code as they all use the same Promise api.

Fixes
+++++

- Server boot and SCLang boot more accurately detect when it is connected and ready for business. Both of these methods return Promises.

Deprec
++++++

These are deprecated and will be removed in 1.0

- require('supercolliderjs').sclang should change to require('supercolliderjs').lang
- require('supercolliderjs').scsynth should change to require('supercolliderjs').server
- Server as EventEmitter: instead of adding handlers to listen to emitted events, subscribe to the ReactiveJS streams. These improve flexibility for debugging


0.4.0
-----

- config file renamed from .supercolliderjs to .supercollider.yaml
- executables renamed so as not to shadow real ones: sclang -> supercollider, scsynth -> supercollider-server
- added sclang-interpret
- sclang emits 'state' change events: booting, compiling, compileError, compiled, ready
- wrote documentation


0.4.1
-----

- fix incorrect bin paths in package.json
- fixed interpreter for 3.6.6 which always requires terminating \n


0.4.9
-----

- FEAT: pass large javascript objects, arrays in multiple requests to keep below the UDP packet limit
