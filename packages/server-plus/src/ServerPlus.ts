/**
 *
 * This is a sketch to make resource creation and management easier.
 *
 * status: ALPHA
 */
import _ from "lodash";

// this means server needs to import lang
import { SynthDefCompiler, SynthDefResultType, SynthDefCompileRequest } from "@supercollider/lang";

import Server, { whenNodeEnd, whenNodeGo, ServerArgs, msg } from "@supercollider/server";

// Store
// import  resolveOptions  from "../server/src/resolveOptions";
// import { whenNodeEnd, whenNodeGo} from "../server/src/node-watcher";
// import { ServerArgs, defaults } from "../server/src/options";
import Store from "@supercollider/server/lib/internals/Store";
// import * as msg from "../server/src/osc/msg";

type Params = msg.Params;

/**
 * scsynth Group
 *
 * See `server.group(...)`
 */
export class Group {
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
  set(settings: Params): void {
    this.server.send.msg(msg.nodeSet(this.id, settings));
  }
  // moveAfter
  // moveBefore
  // onEnd
  // run
  // trace
}

/**
 * Created with `server.synth(...)`
 *
 * Extends Group
 */
export class Synth extends Group {
  // store def and args
  // synthDef
  // release
  // get
}

/**
 * scsynth audio bus
 *
 * See `server.audioBus(...)`
 *
 * These bus numbers (ids) and numChannels are allocated here in the client.
 * The server only gets bus ids for reading and writing to.
 */
export class AudioBus {
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
  free(): void {
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
export class ControlBus extends AudioBus {
  /**
   * Deallocate the ControlBus, freeing it for resuse.
   */
  free(): void {
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
export class Buffer {
  id: number;
  server: ServerPlus;
  numFrames: number;
  numChannels: number;

  constructor(server: ServerPlus, id: number, numFrames: number, numChannels: number) {
    this.server = server;
    this.id = id;
    this.numFrames = numFrames;
    this.numChannels = numChannels;
  }

  /**
   * Deallocate the Buffer, freeing memory on the server.
   */
  async free(): Promise<void> {
    await this.server.callAndResponse(msg.bufferFree(this.id));
    this.server.state.freeBuffer(this.id, this.numChannels);
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
export class SynthDef {
  server: ServerPlus;
  name: string;
  synthDefResult: SynthDefResultType;
  sourceCode?: string;
  path?: string;

  constructor(
    server: ServerPlus,
    defName: string,
    synthDefResult: SynthDefResultType,
    sourceCode?: string,
    path?: string,
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
 * Supplied to synthDefs
 */
// interface SynthDefsArgs {
//   [defName: string]: {
//     source?: string;
//     path?: string;
//   };
// }

/**
 * This extends Server with convienient methods for creating Synth, Group, compiling SynthDefs, creating Buses, Buffers etc.
 *
 * All methods return Promises, and all arguments accept Promises.
 * This means that async actions (like starting a sclang interpreter,
 * compiling SynthDefs and sending them to the server) are complete and their results
 * are ready to be used by whatever they have been supplied to.
 */
export default class ServerPlus extends Server {
  private _synthDefCompiler?: SynthDefCompiler;

  /**
   * Create a Synth on the server
   */
  async synth(
    synthDef: SynthDef,
    args: Params = {},
    group?: Group,
    addAction: number = msg.AddActions.TAIL,
  ): Promise<Synth> {
    const [def, g] = await Promise.all([Promise.resolve(synthDef), Promise.resolve(group)]);
    const nodeId = this.state.nextNodeID();
    // src/ServerPlus.ts:236:29 - error TS2532: Object is possibly 'undefined'. ?
    const sn = msg.synthNew((def as SynthDef).synthDefResult.name, nodeId, addAction, g ? g.id : 0, args);
    this.send.msg(sn);
    await whenNodeGo(this, String(nodeId), nodeId);
    return new Synth(this, nodeId);
  }

  // grainSynth with no id

  /**
   * Create a Group on the server
   */
  async group(group?: Group, addAction: number = msg.AddActions.TAIL): Promise<Group> {
    const g = await Promise.resolve(group);
    const nodeId = this.state.nextNodeID();
    const sn = msg.groupNew(nodeId, addAction, g ? g.id : 0);
    this.send.msg(sn);
    await whenNodeGo(this, String(nodeId), nodeId);
    return new Group(this, nodeId);
  }

  private get synthDefCompiler(): SynthDefCompiler {
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
   * very inefficient.
   *
   * @param defs - An object with `{defName: spec, ...}` where spec is
   *               an object like `{source: "SynthDef('noise', { ...})"}`
   *               or `{path: "./noise.scd"}`
   * @returns An object with the synthDef names as keys and Promises as values.
   *                    Each Promise will resolve with a SynthDef.
   *                    Each Promises can be supplied directly to `server.synth()`
   */
  synthDefs(defs: { [defName: string]: SynthDefCompileRequest }): { [defName: string]: Promise<SynthDef> } {
    const compiling = this.synthDefCompiler.boot().then(() => {
      return this.synthDefCompiler.compileAndSend(defs, this);
    });

    return _.mapValues(defs, async (requested, name) => {
      // for each def await the same promise which returns a dict
      const defsMap = await compiling;
      const result: SynthDefResultType = defsMap[name];
      if (!result) {
        new Error(`${name} not found in compiled SynthDefs`);
      }
      const sourceCode = result.synthDesc.sourceCode;

      const synthDef = new SynthDef(
        this,
        result.name,
        result,
        sourceCode,
        "path" in requested ? requested.path : undefined,
      );
      return synthDef;
    });
  }

  private async _compileSynthDef(defName: string, sourceCode?: string, path?: string): Promise<SynthDef> {
    await this.synthDefCompiler.boot();
    let compileRequest: SynthDefCompileRequest;

    if (sourceCode) {
      compileRequest = { source: sourceCode };
    } else if (path) {
      compileRequest = { path: path };
    } else {
      throw new Error(`Neither sourceCode nor path supplied for compileSynthDef ${defName}`);
    }

    const defs = await this.synthDefCompiler.compileAndSend(
      {
        [defName]: compileRequest,
      },
      this,
    );
    // what if defName does not match synthDefResult.name ?
    const synthDefResult = defs[defName];
    if (!synthDefResult) {
      throw new Error(`SynthDefResult not found ${defName} in synthDefCompiler return values: ${defs}`);
    }
    return new SynthDef(this, defName, synthDefResult, sourceCode, path);
  }

  /**
   * Load and compile a SynthDef from path and send it to the server.
   */
  loadSynthDef(defName: string, path: string): Promise<SynthDef> {
    return this._compileSynthDef(defName, undefined, path);
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
  async buffer(numFrames: number, numChannels = 1): Promise<Buffer> {
    const id = this.state.allocBufferID(numChannels);
    await this.callAndResponse(msg.bufferAlloc(id, numFrames, numChannels));
    return new Buffer(this, id, numFrames, numChannels);
  }

  /**
   * Allocate a Buffer on the server and load a sound file into it.
   *
   * Problem: scsynth uses however many channels there are in the sound file,
   * but the client (sclang or supercolliderjs) doesn't know how many there are.
   */
  async readBuffer(path: string, numChannels = 2, startFrame = 0, numFramesToRead = -1): Promise<Buffer> {
    const id = this.state.allocBufferID(numChannels);
    await this.callAndResponse(msg.bufferAllocRead(id, path, startFrame, numFramesToRead));
    return new Buffer(this, id, numFramesToRead, numChannels);
  }

  /**
   * Allocate an audio bus.
   */
  audioBus(numChannels = 1): AudioBus {
    // TODO: should be a promise that rejects if you run out of busses
    const id = this.state.allocAudioBus(numChannels);
    return new AudioBus(this, id, numChannels);
  }

  /**
   * Allocate a control bus.
   */
  controlBus(numChannels = 1): ControlBus {
    const id = this.state.allocControlBus(numChannels);
    return new ControlBus(this, id, numChannels);
  }
}

/**
 * Start the scsynth server with options:
 *
 * ```js
 *   let server = await sc.server.boot({device: 'Soundflower (2ch)'});
 * ```
 *
 * @memberof server
 *
 * @param options - Optional command line options for server
 * @param store - optional external Store to hold Server state
 */
export async function boot(options?: ServerArgs, store?: Store): Promise<ServerPlus> {
  const s = new ServerPlus(options, store);
  await s.boot();
  await s.connect();
  return s;
}
