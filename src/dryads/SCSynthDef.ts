/* eslint no-console: 0 */
import { Dryad } from "dryadic";
import fs, { promises as fsp } from "fs";
import path from "path";

import { SCLangError } from "../Errors";
import SCLang from "../lang/sclang";
import { defFree, defLoad, defRecv } from "../server/osc/msg";
import Server from "../server/server";
import { MsgType } from "Types";

const StateKeys = {
  SYNTH_DEFS: "SYNTH_DEFS",
};

/**
 * `synthDef` is returned from compilation by sclang and
 * is set in the context for children Dryads to access.
 */
interface CompiledSynthDef {
  name: string;
  bytes: Buffer;
  // object with descriptive meta data
  synthDesc: SynthDesc;
}
interface LoadedSynthDef {
  name: string;
}
export type SynthDef = CompiledSynthDef | LoadedSynthDef;

// Metadata for SynthDef
export type SynthDesc = object;

interface Properties {
  source?: string; //- sclang source code to compile
  compileFrom?: string; // - path of .scd file to compile
  watch: boolean; //     - watch compileFrom file and recompile on changes
  saveToDir?: string; //   - path to save compiled .scsyndef to after compiling
  loadFrom?: string; //    - path of previously compiled .scsyndef file to load to server
  // This can be used to load SynthDefs without needing sclang running at all
}

interface Context {
  sclang?: SCLang;
  synthDef?: CompiledSynthDef;
  scserver?: Server;
  _watcher?: any;
}
/**
 * Compile a SynthDef from sclang source code
 * or load a precompiled .scsyndef
 *
 * If compilation is required then it will insert SCLang as a parent if necessary.
 *
 *
 *
 * Note that the synthDefName is not known until after the source code is compiled.
 *
 */
export default class SCSynthDef extends Dryad<Properties> {
  properties: Properties = { watch: false };
  /**
   * If there is no SCLang in the parent context,
   * then this will wrap itself in an SCLang (language interpreter).
   */
  requireParent(): string | void {
    if (this.properties.source || this.properties.compileFrom) {
      return "SCLang";
    }
  }

  prepareForAdd(): object {
    // search context for a SynthDefCompiler, else create one with context.lang
    return {
      updateContext: (context: Context, properties: Properties) => ({
        synthDef: this._prepareForAdd(context, properties),
      }),
      callOrder: "SELF_THEN_CHILDREN",
    };
  }

  async _prepareForAdd(context: Context, properties: Properties): Promise<CompiledSynthDef | LoadedSynthDef> {
    if (properties.source) {
      let result = await this.compileSource(context, properties.source);
      await this._sendSynthDef(context, properties, result);
      return result;
    }

    if (properties.compileFrom) {
      let result = await this.compileFrom(context, properties.compileFrom);

      await this._sendSynthDef(context, properties, result);
      return result;
    }

    let lf = properties.loadFrom;
    if (lf) {
      // TODO: this is a bad assumption
      // Should allow to read .json metadata files and/or to set the name
      let result: LoadedSynthDef = {
        name: path.basename(lf, path.extname(lf)),
      };
      if (context.scserver) {
        await context.scserver.callAndResponse(defLoad(path.resolve(lf)));
      }
      return result;
    }

    throw new Error("Nothing specified for SCSynthDef: source|compileFrom|loadFrom");
  }

  async _sendSynthDef(context: Context, properties: Properties, result: CompiledSynthDef): Promise<CompiledSynthDef> {
    // ! alters context
    // name bytes
    // synthDefName should be set for child context
    if (!context.scserver) {
      throw new Error("Missing scserver in context");
    }
    this.putSynthDef(context, result.name, result.synthDesc);
    // you need to use a setter
    context.synthDef = result;
    // context.synthDefName = result.name;
    let buffer = new Buffer(result.bytes);
    let promises: Promise<any>[] = [context.scserver.callAndResponse(defRecv(buffer))];
    if (properties.saveToDir) {
      promises.push(this._writeSynthDef(result.name, buffer, result.synthDesc, properties.saveToDir));
    }
    await Promise.all(promises);
    return result;
  }

  async _writeSynthDef(name: string, buffer: Buffer, synthDesc: SynthDesc, saveToDir: string): Promise<void> {
    let dir = path.resolve(saveToDir);
    let pathname = path.join(dir, name + ".scsyndef");
    await fsp.writeFile(pathname, buffer);

    let descpath = path.join(dir, name + ".json");
    await fsp.writeFile(descpath, JSON.stringify(synthDesc, null, 2));
  }

  /**
   * Returns a Promise for a SynthDef result object: name, bytes, synthDesc
   */
  async compileSource(context: Context, sourceCode: string, pathName?: string): Promise<CompiledSynthDef> {
    const wrappedCode = `{
      var def = { ${sourceCode} }.value.asSynthDef;
      (
        name: def.name,
        synthDesc: def.asSynthDesc.asJSON(),
        bytes: def.asBytes()
      )
    }.value;`;
    if (!context.sclang) {
      throw new Error(`Missing sclang in context: ${JSON.stringify(context)}`);
    }

    return context.sclang.interpret(wrappedCode, undefined, false, false, true).then(
      (result: unknown) => {
        // JSONType
        return result as CompiledSynthDef;
      },
      (error: SCLangError) => {
        error.annotate(`Failed to compile SynthDef  ${error.message} ${pathName || ""}`, {
          properties: this.properties,
          sourceCode,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Returns a Promise for a SynthDef result object: name, bytes, synthDesc
   */
  async compileFrom(context: Context, sourcePath: string): Promise<CompiledSynthDef> {
    // TODO: utf-8, no?
    const source = (await fsp.readFile(path.resolve(sourcePath))).toString("ascii");
    return this.compileSource(context, source, sourcePath);
  }

  add(): object {
    return {
      run: (context: Context, properties: Properties) => {
        if (properties.compileFrom && properties.watch) {
          // should use updater here
          context._watcher = fs.watch(path.resolve(properties.compileFrom), () => {
            if (properties.compileFrom) {
              this.compileFrom(context, properties.compileFrom).then((result: CompiledSynthDef) => {
                this._sendSynthDef(context, properties, result).catch(error => console.error(error));
              });
            }
          });
        }
      },
    };
  }

  remove(): object {
    return {
      scserver: {
        // no need to do this if server has gone away
        msg: (context: Context): void | MsgType => {
          if (context.synthDef) {
            return defFree(context.synthDef.name);
          }
        },
      },
      run: (context: Context) => {
        if (context._watcher) {
          context._watcher.close();
          delete context._watcher;
        }
      },
    };
  }

  putSynthDef(context: Context, synthDefName: string, synthDesc: object) {
    context.scserver &&
      context.scserver.state.mutate(StateKeys.SYNTH_DEFS, state => {
        return state.set(synthDefName, synthDesc);
      });
  }

  /**
   * Return the value of this object, which is the synthDef: {name, bytes, synthDesc}
   * for use in /s_new.
   */
  value(context: Context): SynthDef {
    if (!context.synthDef) {
      throw new Error("No synthDef in context for SCSynthDef");
    }
    return context.synthDef;
  }
}
