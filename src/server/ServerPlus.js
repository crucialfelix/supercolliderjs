/**
 * @flow
 *
 * This is a sketch to make resource creation and management easier.
 *
 * status: ALPHA
 */
import _ from 'lodash';
import Server from './server';
import * as msg from './osc/msg';
import { whenNodeGo, whenNodeEnd } from './node-watcher';
import SynthDefCompiler from '../lang/SynthDefCompiler';
import resolveOptions from '../utils/resolveOptions';
import type { SynthDefResultType } from '../Types';

/**
 * scsynth Group
 *
 * See `server.group(...)`
 */
class Group {
  id: number;
  server: ServerPlus;

  constructor(server: ServerPlus, id: number) {
    this.id = id;
    this.server = server;
  }

  /**
   * Stop the Group and remove it from the play graph on the server.
   */
  free(): Promise<number> {
    this.server.send.msg(msg.nodeFree(this.id));
    return whenNodeEnd(this.server, String(this.id), this.id);
  }

  /**
   * Update control parameters on the Synth.
   *
   * @example
   * ```js
   * synth.set({freq: 441, amp: 0.9});
   * ```
   *
   * This method works for Group and Synth.
   * For a Group it sends the set message to all children Synths
   * in the Group.
   */
  set(settings: Object) {
    this.server.send.msg(msg.nodeSet(this.id, settings));
  }
  // moveAfter
  // moveBefore
  // onEnd
  // run
  // trace
}

/**
 * scsynth Synth
 *
 * See `server.synth(...)`
 */
class Synth extends Group {
  // store def and args
  // synthDef
  // release
  // get
}

/**
 * scsynth audio bus

 * See `server.audioBus(...)`
 *
 * These bus numbers (ids) and numChannels are allocated here in the client.
 * The server only gets bus ids for reading and writing to.
 */
class AudioBus {
  id: number;
  server: ServerPlus;
  numChannels: number;

  constructor(server: ServerPlus, id: number, numChannels: number) {
    this.server = server;
    this.id = id;
    this.numChannels = numChannels;
  }

  /**
   * Deallocate the AudioBus, freeing it for resuse.
   */
  free() {
    this.server.state.freeAudioBus(this.id, this.numChannels);
  }
}

/**
 * scsynth control bus

 * See `server.controlBus(...)`
 *
 * These bus numbers (ids) and numChannels are allocated here in the client.
 * The server only gets bus ids for reading and writing to.
 */
class ControlBus extends AudioBus {
  /**
   * Deallocate the ControlBus, freeing it for resuse.
   */
  free() {
    this.server.state.freeControlBus(this.id, this.numChannels);
  }
  // set
  // fill
  // get
}

/**
 * scsynth Buffer
 *
 * See `server.buffer(...)` and `server.readBuffer(...)`
 */
class Buffer {
  id: number;
  server: ServerPlus;
  numFrames: number;
  numChannels: number;

  constructor(
    server: ServerPlus,
    id: number,
    numFrames: number,
    numChannels: number
  ) {
    this.server = server;
    this.id = id;
    this.numFrames = numFrames;
    this.numChannels = numChannels;
  }

  /**
   * Deallocate the Buffer, freeing memory on the server.
   */
  free(): Promise<number> {
    return this.server.callAndResponse(msg.bufferFree(this.id)).then(() => {
      this.server.state.freeBuffer(this.id, this.numChannels);
    });
  }

  // read
  // write
  // zero
  // set frames
  // fill
  // gen
  // close
  // query
  // get
}

/**
 * scsynth SynthDef
 *
 * See `server.synthDefs(...)`
 *
 * These are currently compiled using sclang,
 * and the synthDefResult holds metadata about the compiled
 * synthdef and the raw compiled bytes.
 *
 * The SynthDef may have been compiled from a sourceCode string
 * or compiled from a file at path.
 */
class SynthDef {
  server: ServerPlus;
  name: string;
  synthDefResult: SynthDefResultType;
  sourceCode: ?string;
  path: ?string;

  constructor(
    server: ServerPlus,
    defName: string,
    synthDefResult: SynthDefResultType,
    sourceCode: ?string,
    path: ?string
  ) {
    this.server = server;
    this.name = defName;
    this.synthDefResult = synthDefResult;
    this.sourceCode = sourceCode;
    this.path = path;
    // SynthDefCompiler will watch the path
  }

  // free
  // setSource
  // get info about def
}

/**
 * This extends Server with convienient methods for creating Synth, Group, compiling SynthDefs, creating Buses, Buffers etc.
 *
 * All methods return Promises, and all arguments accept Promises.
 * This means that async actions (like starting a sclang interpreter,
 * compiling SynthDefs and sending them to the server) are complete and their results
 * are ready to be used by whatever they have been supplied to.
 */
export default class ServerPlus extends Server {
  /**
   * @private
   */
  _synthDefCompiler: ?SynthDefCompiler;

  /**
   * Create a Synth on the server
   */
  synth(
    synthDef: SynthDef,
    args: Object = {},
    group: ?Group,
    addAction: number = msg.AddActions.TAIL
  ): Promise<Synth> {
    return Promise.all([
      Promise.resolve(synthDef),
      Promise.resolve(group)
    ]).then(([def, g]) => {
      let nodeId = this.state.nextNodeID();
      let sn = msg.synthNew(def.name, nodeId, addAction, g ? g.id : 0, args);
      this.send.msg(sn);
      // unique string for callback registration
      return whenNodeGo(this, String(nodeId), nodeId).then(
        () => new Synth(this, nodeId)
      );
    });
  }

  // grainSynth with no id

  /**
   * Create a Group on the server
   */
  group(
    group: ?Group,
    addAction: number = msg.AddActions.TAIL
  ): Promise<Group> {
    return Promise.resolve(group).then(g => {
      let nodeId = this.state.nextNodeID();
      let sn = msg.groupNew(nodeId, addAction, g ? g.id : 0);
      this.send.msg(sn);
      // unique string for callback registration
      return whenNodeGo(this, String(nodeId), nodeId).then(() => {
        return new Group(this, nodeId);
      });
    });
  }

  /**
   * @private
   */
  get synthDefCompiler(): SynthDefCompiler {
    if (!this._synthDefCompiler) {
      this._synthDefCompiler = new SynthDefCompiler();
    }
    return this._synthDefCompiler;
  }

  /**
   * Compile multiple SynthDefs either from source or path.
   * If you have more than one to compile then always use this
   * as calling `server.synthDef` multiple times will start up
   * multiple supercollider interpreters. This is harmless, but
   * you do have a lot of icons bouncing in your dock.
   *
   * @param defs - An object with `{defName: spec, ...}` where spec is
   *               an object like `{source: "SynthDef('noise', { ...})"}`
   *               or `{path: "./noise.scd"}`
   * @returns An object with the synthDef names as keys and Promises as values.
   *                    Each Promise will resolve with a SynthDef.
   *                    Each Promises can be supplied directly to `server.synth()`
   */
  synthDefs(defs: Object): { [defName: string]: Promise<SynthDef> } {
    let compile = this.synthDefCompiler.boot().then(() => {
      return this.synthDefCompiler.compileAndSend(defs, this);
    });

    return _.mapValues(defs, (requested, name) => {
      return new Promise((resolve, reject) => {
        return compile.then(defsMap => {
          let result = defsMap[name];
          if (!result) {
            return reject(new Error(`${name} not found in compiled SynthDefs`));
          }
          if (result.name !== name) {
            return reject(
              new Error(
                `SynthDef compiled as ${result.name} but server.synthDefs was called with: ${name}`
              )
            );
          }
          resolve(
            new SynthDef(
              this,
              result.name,
              result,
              result.synthDesc.sourceCode,
              requested && requested.path
            )
          );
        });
      });
    });
  }

  /**
   * @private
   */
  _compileSynthDef(
    defName: string,
    sourceCode: ?string,
    path: ?string
  ): Promise<SynthDef> {
    return this.synthDefCompiler.boot().then(() => {
      return this.synthDefCompiler
        .compileAndSend(
          {
            [defName]: sourceCode ? { source: sourceCode } : { path: path }
          },
          this
        )
        .then(defs => {
          // what if defName does not match synthDefResult.name ?
          let synthDefResult = defs[defName];
          if (!synthDefResult) {
            throw new Error(
              `SynthDefResult not found ${defName} in compile return values`
            );
          }
          return new SynthDef(this, defName, synthDefResult, sourceCode, path);
        });
    });
  }

  /**
   * Load and compile a SynthDef from path and send it to the server.
   */
  loadSynthDef(defName: string, path: string): Promise<SynthDef> {
    return this._compileSynthDef(defName, null, path);
  }

  /**
   * Compile a SynthDef from supercollider source code and send it to the server.
   */
  synthDef(defName: string, sourceCode: string): Promise<SynthDef> {
    return this._compileSynthDef(defName, sourceCode);
  }

  /**
   * Allocate a Buffer on the server.
   */
  buffer(numFrames: number, numChannels: number = 1): Promise<Buffer> {
    let id = this.state.allocBufferID(numChannels);
    return this.callAndResponse(
      msg.bufferAlloc(id, numFrames, numChannels)
    ).then(() => new Buffer(this, id, numFrames, numChannels));
  }

  /**
   * Allocate a Buffer on the server and load a sound file into it.
   *
   * Problem: scsynth uses however many channels there are in the sound file,
   * but the client (sclang or supercolliderjs) doesn't know how many there are.
   */
  readBuffer(
    path: string,
    numChannels: number = 2,
    startFrame: number = 0,
    numFramesToRead: number = -1
  ): Promise<Buffer> {
    let id = this.state.allocBufferID(numChannels);
    return this.callAndResponse(
      msg.bufferAllocRead(id, path, startFrame, numFramesToRead)
    ).then(() => new Buffer(this, id, numFramesToRead, numChannels));
  }

  /**
   * Allocate an audio bus.
   */
  audioBus(numChannels: number = 1): AudioBus {
    let id = this.state.allocAudioBus(numChannels);
    return new AudioBus(this, id, numChannels);
  }

  /**
   * Allocate a control bus.
   */
  controlBus(numChannels: number = 1): ControlBus {
    let id = this.state.allocControlBus(numChannels);
    return new ControlBus(this, id, numChannels);
  }
}

/**
 * Start the scsynth server with options:
 *
 * ```js
 *   sc.server.boot({device: 'Soundflower (2ch)'}).then(server => {
 *     //
 *   });
 *
 *   sc.server.boot({serverPort: '11211'})
 * ```
 *
 * @memberof server
 *
 * @param {Object} options - Optional command line options for server
 * @param {Store} store - optional external Store to hold Server state
 * @returns {Promise} - resolves with a Server (ServerPlus actually)
 */
export function boot(
  options: Object = {},
  store: any = null
): Promise<ServerPlus> {
  return resolveOptions(undefined, options).then(opts => {
    var s = new ServerPlus(opts, store);
    return s.boot().then(() => s.connect()).then(() => s);
  });
}
