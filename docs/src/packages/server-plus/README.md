{{> header}}

This extends the `Server` class from `@supercollider/server`, adding methods for commonly used constructs.


Each method returns a Promise that resolves when the resource is successfully created. Each method accepts Promises as arguments.

{{#example}}examples/server-plus-promises.js{{/example}}

## synth
Spawn a synth
```js
synth(
    synthDef: SynthDef,
    args: Params = {},
    group?: Group,
    addAction: number = msg.AddActions.TAIL,
  ): Promise<Synth>;
```

## group
A collection of other nodes organized as a linked list. The
Nodes within a Group may be controlled together, and may be both Synths and
other Groups. Groups are thus useful for controlling a number of nodes at once,
and when used as targets can be very helpful in controlling order of execution.

```js
group(group?: Group, addAction: number = msg.AddActions.TAIL): Promise<Group>;
```

## synthDefs
Compile multiple SynthDefs either from source or path.
If you have more than one to compile then always use this
as calling `server.synthDef` multiple times will start up
multiple supercollider interpreters. This is harmless, but
very inefficient.

defs - An object with `{defName: spec, ...}` where spec is
an object like `{source: "SynthDef('noise', { ...})"}`
or `{path: "./noise.scd"}`

Returns an object with the synthDef names as keys and Promises as values.
Each Promise will resolve with a SynthDef.
Each Promises can be supplied directly to `server.synth()`

```js
synthDefs(defs: { [defName: string]: SynthDefCompileRequest }): { [defName: string]: Promise<SynthDef> }
```

## loadSynthDef
Load and compile a SynthDef from path and send it to the server.
```js
loadSynthDef(defName: string, path: string): Promise<SynthDef>;
```

## synthDef
Compile a SynthDef from supercollider source code and send it to the server.
```js
synthDef(defName: string, sourceCode: string): Promise<SynthDef>;
```

## buffer
Allocate a Buffer on the server.
```js
buffer(numFrames: number, numChannels = 1): Promise<Buffer>;
```

## audioBus
Allocate an audio bus.
```js
audioBus(numChannels = 1): AudioBus;
```

## controlBus
Allocate a control bus.
```js
controlBus(numChannels = 1): ControlBus;
```

## readBuffer
Allocate a Buffer on the server and load a sound file into it.
Problem: scsynth uses however many channels there are in the sound file,
but the client (sclang or supercolliderjs) doesn't know how many there are.

```js
readBuffer(path: string, numChannels = 2, startFrame = 0, numFramesToRead = -1): Promise<Buffer>;
```


### Kitchen sink

{{#example}}examples/server-plus.js{{/example}}

{{> footer }}