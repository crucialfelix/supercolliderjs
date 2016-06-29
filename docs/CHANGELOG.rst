CHANGELOG
=========

0.11.2
++++++

sc-classes was renamed to supercollider-js but it was published to npm with both versions.
This release only removes the old sc-classes folder.

0.11.1
++++++

bb7f7be classlib: If error thrown during initClassTree then post normal raw error
47ebe05 move sc-classes -> supercollider-js for increased obviousness
fd826a5 Reject promise on failure of spawn process (sclang/scsynth)
3747f47 Cleaner compile state handling
713e8cf Optionally allow sclang to boot if the supplied sclang_conf does not yet exist. Catch error and reject Promise if options.failIfSclangConfIsMissing.
db11408 fix: when saving sclang_config remove supercollider js classes and then reinsert them and save to the temp runtime config file.
a51d2bd Update README with badges, minor text updates
4203e03 dependencies updates
6c9421f resolveOptions: add default path for sclang_conf.yaml

0.11.0
++++++

dc2dd2b fix timezone in osc time tag test
994752f update dev dependencies
f84481f In case server failed to start, do not throw error on remove.
4ae0cd4 change: Synth arguments now support simple functions
7048f31 update to dryadic 0.2.0 - moved Store back into supercollider.js
8e051c0 fix .out in SynthStream SynthEventList and AudioBus
0009107 log scsynth stdout messages with ERROR|FAILURE as errors to stderr
1a1fa28 reject Promise with Error - bluebird requires this
4e1b868 update scserver command middleware to new dryadic api
b44a995 SCSynthDef: only require SCLang if compiling options were specified. If just loading from scsyndef file then an interpreter not needed.
82bfdcc log all /fail messages as errors
1696372 Accept an optional external logger, pass this to SCLang and SCServer. Support dryadic's rootContext
60627cb scserver: explicitly kill child process
f96ab62 npmignore docs etc.
aa811de remove npm-shrinkwrap as it ludicrously forces all devDependencies to be installed for endusers.


0.10.0
++++++

Documentation of Dryadic will come later. This is still in alpha.

- add dryadic library
- export top level functions: dryadic() play() and h()
  These automatically include the supercollider layer (Synth Group etc)
- add Dryad classes and scsynth command middleware layer
- Synth
- Group
- SCServer
- SCLang
- SCSynthDef compiles, watches files, writes .json file with synthDesc as well as the .scsyndef
- SCSynthDef watch - watch a source file and recompile def on changes
- SCSynthDef saveToDir - save compiled synth def
- AudioBus
- SynthStream
- SynthControl
- SynthEventList

- add map function: linear, exp, dB, fader
- add reverse mapping functions: linear, exp, dB, fader


- change: default synthNew to add to TAIL not HEAD
- rename SCSynth -> SCServer

- support for OSC bundles and timetags
- upgrade to orc-min 1.1.1
- send-bundle example
- add send-bundle example to examples/boot-server.js

- osc groupNew: default add action add to tail

- fix(sclang-io): match beta releases in version parsing

- testing: factor out server._spawnProcess and mock that rather than the whole child_process module

- deprecate older dryadic helper functions

- update dependencies

- Relax node engine requirement to 0.10.0 because atom apm is refusing to install
  even though it uses node 4, because apm itself is stuck on 0.10.0


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
