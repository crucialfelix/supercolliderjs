
0.14.2 / 2016-03-18
===================

* Support all command line arguments for scsynth
* Switch sound input/output device with options to scsynth
* Support custom enviornment vars for scsynth (eg. set SC_JACK_DEFAULT_INPUTS)
* fix: Verbosity is -V now, not -v
* package: remove the node engine restriction of  <7

0.14.1 / 2016-03-18
===================

* Fix 27 : return inf as the string “Infinity”, -inf as “-Infinity” and NaN as “NaN”


0.14.0 / 2016-11-22
==================

  * Add new API: ServerPlus
  * Examples moved to https://github.com/crucialfelix/supercolliderjs-examples
  * Add new docs and API documentation
  * CHANGE: generate main package export from src/index.js
  * add SynthDefResultMapType
  * add checkInstall.js utility: checks that sclang/scsynth exists, prints the the config to console.
  * add SynthDefCompiler - utility class to compile SynthDefs
  * fix: dryads/SCSynthDef watch file was calling _sendSynthDef with incorrect args

0.13.0 / 2016-10-24
===================

  * Refactor Dryad command functions for new dryadic properties support.
    This removed all the juggling in Synth to support properties that might be Dryads.
    Now any Dryad can have Dryads in it's properties.
    SCLang and SCServer can block the command call stack until they've finished booting.
  * remove old functional dryads
    These were version 1 - pure functions. It got confusing to read and to write them.
    API was too hard to reason about.
  * Add flowtype checking
  * Increase default osc latency to 0.05
    Will have this as an option somewhere.
  * Synth: set 'out' to context.out if not already set
    Doesn't check if the SynthDef has 'out' but it's harmless.
    Will add a check later.
  * fix AudioBus and Group prepareForAdd
    Group was setting .group for children incorrectly
    Both AudioBus and Group should call self, then children.
  * rework SCError, add SCLangError
    This makes SCLangError quack just like the plain object that used to be
    rejected from interpret syntax/execution errors. So the API does not change at all.
  * debugging: post OSC buffers (SynthDefs) as hex strings
  * fix: update sclang-io for new guid regexp
    Unit tests didn't catch this. A larger integration test should do this.
  * SynthStream: support separate noteOn / noteOff event.types
  * replace node-uuid with cuid
    node-uuid always posts a warning about being insecure, but the usage of ids
    here is just a short random collision-busting id; it doesn't need to RFC4122
    compliant or cryptographically secure.
  * change: always throw or reject Promises with Error subclass, not objects or strings
    This is on advice of Bluebird; it is better for debugging (includes the stack)
    Added SCError class that holds arbitrary data objects.

0.12.0 / 2016-08-19
===================

  * Merge branch 'release/0.12.0' into develop
  * update dryadic
  * trailing comma in package.json
  * bump version, update the description
  * update CHANGELOG
  * update dev dependencies
  * SCSynthDef: should return Promise on add
  * Merge branch 'feature/flow-type' into develop
  * add some flow type annotations
  * add flow for type checking and babel transforms to remove annotations
    Stop doing jscs checking in test. jscs is merging with eslint anyway,
    and eslint can check flowtype annotations. Will remove jscs later.
  * Merge branch 'feature/osc-sched-refactor' into develop
  * change: do not send events that are in the past, posts warning to console
    fix: loopedEventListIterator - set correct i when searching
  * loopedEventListIterator: handle negative now (pre-roll) so it finds first event
  * remove unused epoch arg
  * add simple SynthEventList example
  * factor event list iterators into separate functions
    OSCSched loops using logical time, not accumulated floating point error time
  * SynthEventList: fix looping
  * fix(OSCSched): deltaTimeTag takes seconds not millis
    jit shed subtract latency
    throw error if epoch is not set
  * SynthEventList: set context.epoch if none supplied
  * fix(scserver middleware): schedLoop is a function maker, not the loop function
  * SynthEventList: support looping
  * documentation
  * Update SynthEventList to use schedLoop
  * change(OSCSched): now takes getNextFn rather than an event list.
    This allows many types of iterating, looping, spawning, tempo etc functions
    to be implemented.
    The previous version was never released so this doesn't break any existing code.
  * fix: Synth .def will be undefined when SynthDef is the parent of the Synth
    (which happens when .def is a dryad and subgraph flips SynthDef to be parent of Synth)
    bug introduced in 04d2752687ea983cbdfe775701a3942a90bd800c
  * Merge branch 'feature/osc-sched' into develop
  * SynthEventList: uses OSCSched now, so send relative times not osc time tags
  * change(scserver): sched command now uses just-in-time scheduler.
    This will now unschedule any previous events for the context.
    Previously it would have sent them all immediately to scsynth.
  * OSCSched - just in time scheduler for OSC bundles

0.11.3 / 2016-07-06
===================

  * Merge branch 'release/0.11.3' into develop
  * bump version
  * test fix
  * fix: default node logger does not have .debug, use .info instead
  * resolveOptions: correct default path for scsynth in SC 3.7
  * Fix failure to capture trailing output after interpret
    that is outside of capture.
    fix: https://github.com/crucialfelix/atom-supercollider/issues/70
  * Synth: if synthDef is a Dryad then invert parent-child in the subgraph
    Previously it did this in one step, now there will be 2 inversions in the subgraph.

0.11.2 / 2016-06-29
===================

  * Merge branch 'release/0.11.2' into develop
  * updated CHANGELOG
  * update version, dependencies

0.11.1 / 2016-06-27
===================

  * Merge branch 'release/0.11.1' into develop
  * 0.11.1
  * classlib: If error thrown during initClassTree then post normal raw error
    Fixes https://github.com/crucialfelix/atom-supercollider/issues/58
  * move sc-classes -> supercollider-js for increased obviousness
  * Reject promise on failure of spawn process (sclang/scsynth)
  * Cleaner compile state handling
    sclang.boot() now resolves with an object including compile paths
    sclang.compilePaths() returns latest compilePaths
    Fixes some messy state juggling inside sclang-io
  * Optionally allow sclang to boot if the supplied sclang_conf does not yet exist.
    Catch error and reject Promise if options.failIfSclangConfIsMissing.
    Was throwing an unhandled Error.
  * fix: when saving sclang_config remove supercollider js classes
    and then reinsert them and save to the temp runtime config file.
    Otherwise SuperColliderJS kept being left in the config file which
    is annoying if you go back to the SC IDE.
  * Update README with badges, minor text updates
  * dependencies updates
  * resolveOptions: add default path for sclang_conf.yaml

0.11.0 / 2016-04-27
===================

  * Merge branch 'release/0.11.0' into develop
  * 0.11.0
  * fix timezone in osc time tag test
  * update dev dependencies
  * update engine compatibility for node 6
  * run travis on each major version up through 6
  * In case server failed to start, do not throw error on remove.
    This happens when quitting an external app which would tell the dryad tree
    to remove everything; even things that were never successfully added.
  * change: Synth arguments now support simple functions
    They are passed the current context.
  * update to dryadic 0.2.0 - moved Store back into supercollider.js
  * fix .out in SynthStream SynthEventList and AudioBus
  * log scsynth stdout messages with ERROR|FAILURE as errors to stderr
    So they show up in friendly alarming red on the command line regardless
    of your logging level.
  * reject Promise with Error - bluebird requires this
  * update scserver command middleware to new dryadic api
  * SCSynthDef: only require SCLang if compiling options were specified.
    If just loading from scsyndef file then an interpreter not needed.
  * log all /fail messages as errors
  * Accept an optional external logger, pass this to SCLang and SCServer.
    Support dryadic's rootContext
    This allows use of standard logging tools like winston (remote logging,
    log to file, log to database)
  * scserver: explicitly kill child process
    In Electron it was re-parenting the scsynth child process rather than shutting it down.
  * npmignore docs etc.
    This was a lot of useless baggage, sorry.
  * remove npm-shrinkwrap as it ludicrously forces all devDependencies to be installed
    for endusers.

0.10.0 / 2016-04-18
===================

  * Merge branch 'release/0.10.0' into develop
  * bump version
  * README and CHANGELOG
  * Relax node engine requirement to 0.10.0 because atom apm is refusing to install
    even though it uses node 4, because apm itself is stuck on 0.10.0
