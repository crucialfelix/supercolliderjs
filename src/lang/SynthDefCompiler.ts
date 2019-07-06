import fs from "fs";
import _ from "lodash";
import path from "path";

import { defRecv } from "../server/osc/msg";
import Server from "../server/server";
import { CallAndResponse } from "../Types";
import SCLang, { boot, SclangResultType } from "./sclang";

export interface SynthDefResultType {
  name: string;
  bytes: Buffer;
  synthDesc: {
    sourceCode?: string;
    // TODO: define the other values of synthDesc
  };
}

interface SynthDefResultMapType {
  [defName: string]: SynthDefResultType;
}

interface SynthDefCompileRequestWithSource {
  source: string;
}
interface SynthDefCompileRequestWithPath {
  path: string;
}
export type SynthDefCompileRequest = SynthDefCompileRequestWithSource | SynthDefCompileRequestWithPath;

/**
 * Utility class to compile SynthDefs either from source code or by loading a path.
 *
 * Stores metadata, watches path for changes and can resend on change.
 * Can write compiled synthDefs to .scsyndef
 *
 * @ member of lang
 */
export default class SynthDefCompiler {
  lang?: SCLang;
  store: Map<string, SynthDefResultType>;

  constructor(lang?: SCLang) {
    this.lang = lang;
    this.store = new Map();
  }

  async boot() {
    if (!this.lang) {
      this.lang = await boot();
    }
    return this.lang;
  }

  /**
   * Returns an object with each compiled synthdef
   * as a SynthDefResultType.
   */
  async compile(defs: object): Promise<SynthDefResultMapType> {
    let defsList = _.toPairs(defs);
    let compiledDefs = await Promise.all(_.map(defsList, ([defName, spec]) => this._compileOne(defName, spec)));
    return _.fromPairs(_.map(compiledDefs, result => [result.name, result]));
  }

  /**
   * Compile SynthDefs and send them to the server.
   *
   * @returns a Promise for {defName: SynthDefResult, ...}
   */
  async compileAndSend(defs: object, server: Server): Promise<SynthDefResultMapType> {
    // compile...
    const compiledDefs = await this.compile(defs);
    // send...
    let commands = _.map(compiledDefs, ({ name }) => this.sendCommand(name));
    await Promise.all(commands.map(cmd => server.callAndResponse(cmd)));
    return compiledDefs;
  }

  set(defName: string, data: SynthDefResultType) {
    this.store.set(defName, data);
    return data;
  }

  get(defName: string): SynthDefResultType | undefined {
    return this.store.get(defName);
  }

  allSendCommands() {
    let commands: CallAndResponse[] = [];
    this.store.forEach((value, defName) => {
      commands.push(this.sendCommand(defName));
    });
    return commands;
  }

  sendCommand(defName: string) {
    let data = this.get(defName);
    if (!data) {
      throw new Error(`SynthDef not in store: ${defName}`);
    }
    let buffer = new Buffer(data.bytes);
    return defRecv(buffer);
  }

  // sendAll(server) {
  //   return Promise.all(
  //     this.store.keys().map((defName) => this.send(defName, server))
  //   );
  // }
  //
  // send(defName:string, server:Server) {
  //   let data = this.get(defName);
  //   let buffer = new Buffer(data.bytes);
  //   let promises = [
  //     context.scserver.callAndResponse(defRecv(buffer))
  //   ];
  //
  // }

  private async _compileOne(defName: string, spec: SynthDefCompileRequest): Promise<SynthDefResultType> {
    // path or source
    if ("source" in spec) {
      return this.compileSource(spec.source).then((result: SynthDefResultType) => {
        this.set(defName, result);
        return result;
      });
    }

    // if watch then add a watcher

    if ("path" in spec) {
      return this.compilePath(spec.path).then((result: SynthDefResultType) => {
        this.set(result.name, result);
        return result;
      });
    }

    throw new Error(`Spec to SynthDefCompiler not recognized ${defName} ${JSON.stringify(spec)}`);
  }

  /**
   * Returns a Promise for a SynthDef result object: name, bytes, synthDesc
   */
  async compileSource(sourceCode: string, pathName?: string): Promise<SynthDefResultType> {
    const wrappedCode = `{
      var def = { ${sourceCode} }.value.asSynthDef;
      (
        name: def.name,
        synthDesc: def.asSynthDesc.asJSON(),
        bytes: def.asBytes()
      )
    }.value;`;
    if (this.lang) {
      try {
        const result: SclangResultType = await this.lang.interpret(wrappedCode, undefined, false, false, true);
        // force casting it to the expected type
        return (result as unknown) as SynthDefResultType;
      } catch (error) {
        error.annotate(`Failed to compile SynthDef  ${error.message} ${pathName || ""}`, {
          sourceCode,
        });
        throw error;
      }
    }
    throw new Error(`sclang interpreter is not present: ${this.lang}`);
  }

  /**
   * Returns a Promise for a SynthDef result object: name, bytes, synthDesc
   */
  compilePath(sourcePath: string): Promise<SynthDefResultType> {
    return new Promise((resolve, reject) => {
      fs.readFile(path.resolve(sourcePath), (err, fileBuf) => {
        if (err) {
          reject(err);
        } else {
          // is it really just ascii ?
          this.compileSource(fileBuf.toString("ascii"), sourcePath).then(resolve, reject);
        }
      });
    });
  }
}
