/**
 * @flow
 */

import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import { defRecv } from '../server/osc/msg.js';
import { boot } from './sclang';
import type { SCLangError } from '../Errors';
import {
  SclangResultType,
  SynthDefResultType,
  SynthDefResultMapType
} from '../Types';
import type Server from '../server/server';
import type SCLang from './sclang';

/**
 * Utility class to compile SynthDefs either from source code or by loading a path.
 *
 * Stores metadata, watches path for changes and can resend on change.
 * Can write compiled synthDefs to .scsyndef
 *
 * @ member of lang
 */
export default class SynthDefCompiler {
  lang: ?SCLang;
  store: Map<string, SynthDefResultType>;

  constructor(lang: ?SCLang) {
    this.lang = lang;
    this.store = new Map();
  }

  boot() {
    if (!this.lang) {
      return boot().then(lang => {
        this.lang = lang;
        return this.lang;
      });
    }
    return Promise.resolve(this.lang);
  }

  /**
   * Returns an object with each compiled synthdef
   * as a SynthDefResultType.
   */
  compile(defs: Object): Promise<SynthDefResultMapType> {
    let defsList = _.toPairs(defs);
    return Promise.all(
      _.map(defsList, ([defName: string, spec: Object]) =>
        this._compileOne(defName, spec))
    ).then(compiledDefs => {
      let defsMap = _.fromPairs(
        _.map(compiledDefs, result => [result.name, result])
      );
      return defsMap;
    });
  }

  /**
   * Compile SynthDefs and send them to the server.
   *
   * @returns a Promise for {defName: SynthDefResult, ...}
   */
  compileAndSend(defs: Object, server: Server): Promise<SynthDefResultMapType> {
    return this.compile(defs).then(compiledDefs => {
      let commands = _.map(compiledDefs, ({ name }) => this.sendCommand(name));
      return Promise.all(commands.map(cmd => server.callAndResponse(cmd))).then(
        () => compiledDefs
      );
    });
  }

  set(defName: string, data: SynthDefResultType) {
    this.store.set(defName, data);
    return data;
  }

  get(defName: string): SynthDefResultType {
    return this.store.get(defName);
  }

  allSendCommands() {
    let commands = [];
    for (let defName of this.store.keys()) {
      commands.push(this.sendCommand(defName));
    }
    return commands;
  }

  sendCommand(defName: string) {
    let data = this.get(defName);
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

  _compileOne(defName: string, spec: Object): Promise<SynthDefResultType> {
    // path or source
    if (spec.source) {
      return this.compileSource(
        spec.source
      ).then((result: SclangResultType) => {
        this.set(defName, result);
        return result;
      });
    }

    // if watch then add a watcher

    if (spec.path) {
      return this.compilePath(spec.path).then((result: SclangResultType) => {
        this.set(result.name, result);
        return result;
      });
    }

    return Promise.reject(
      new Error(
        `Spec to SynthDefCompiler not recognized ${defName} ${JSON.stringify(spec)}`
      )
    );
  }

  /**
   * Returns a Promise for a SynthDef result object: name, bytes, synthDesc
   */
  compileSource(
    sourceCode: string,
    pathName: ?string
  ): Promise<SynthDefResultType> {
    const wrappedCode = `{
      var def = { ${sourceCode} }.value.asSynthDef;
      (
        name: def.name,
        synthDesc: def.asSynthDesc.asJSON(),
        bytes: def.asBytes()
      )
    }.value;`;
    if (this.lang) {
      return this.lang
        .interpret(wrappedCode, undefined, false, false, true)
        .then(
          (result: SynthDefResultType) => {
            return result;
          },
          (error: SCLangError) => {
            error.annotate(
              `Failed to compile SynthDef  ${error.message} ${pathName || ''}`,
              {
                sourceCode
              }
            );
            return Promise.reject(error);
          }
        );
    }
    return Promise.reject(new Error('SC intpreter is not booted'));
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
          this.compileSource(fileBuf.toString('ascii'), sourcePath).then(
            resolve,
            reject
          );
        }
      });
    });
  }
}
