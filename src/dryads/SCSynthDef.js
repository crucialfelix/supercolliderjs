/* @flow */
import {Dryad} from 'dryadic';
import {defRecv, defFree, defLoad} from '../server/osc/msg.js';
import path from 'path';
import fs from 'fs';
import type { SCLangError } from '../Errors';
import { SclangResultType } from '../Types';

const StateKeys = {
  SYNTH_DEFS: 'SYNTH_DEFS'
};


/**
 * Compile a SynthDef from sclang source code
 * or load a precompiled .scsyndef
 *
 * If compilation is required then it will insert SCLang as a parent if necessary.
 *
 * properties:
 *  - source      - sclang source code to compile
 *  - compileFrom - path of .scd file to compile
 *  - watch  (Boolean)     - watch compileFrom file and recompile on changes
 *  - saveToDir   - path to save compiled .scsyndef to after compiling
 *  - loadFrom    - path of previously compiled .scsyndef file to load to server
 *  							This can be used to load SynthDefs without needing sclang running at all.
 *
 * `synthDef` is set in the context for children Dryads to access.
 * It is an object:
 * - .name
 * - .bytes
 * - .synthDesc object with descriptive meta data
 *
 * `synthDefName` is also set in context for children Dryads
 *
 * The synthDefName is not known until after the source code is compiled.
 *
 */
export default class SCSynthDef extends Dryad {

  /**
   * If there is no SCLang in the parent context,
   * then this will wrap itself in an SCLang (language interpreter).
   */
  requireParent() : ?string {
    if (this.properties.source || this.properties.compileFrom) {
      return 'SCLang';
    }
  }

  prepareForAdd() : Object {
    return {
      updateContext: (context, properties) => ({
        synthDef: this._prepareForAdd(context, properties)
      }),
      callOrder: 'SELF_THEN_CHILDREN'
    };
  }

  _prepareForAdd(context:Object, properties:Object) : Promise<SclangResultType> {
    if (properties.source) {
      return this.compileSource(context, properties.source)
        .then((result:SclangResultType) => this._sendSynthDef(context, properties, result));
    }

    if (properties.compileFrom) {
      return this.compileFrom(context, properties.compileFrom)
        .then((result:SclangResultType) => this._sendSynthDef(context, properties, result));
    }

    let lf = properties.loadFrom;
    if (lf) {
      // TODO: this is a bad assumption
      // Should allow to read .json metadata files and/or to set the name
      let result = {
        name: path.basename(lf, path.extname(lf))
      };
      return context.scserver.callAndResponse(defLoad(path.resolve(lf)))
        .then(() => result);
    }

    throw new Error('Nothing specified for SCSynthDef: source|compileFrom|loadFrom');
  }

  _sendSynthDef(context:Object, properties:Object, result:SclangResultType) : Promise<SclangResultType> {
    // ! alters context
    // name bytes
    // synthDefName should be set for child context
    this.putSynthDef(context, result.name, result.synthDesc);
    // you need to use a setter
    context.synthDefName = result.name;
    let buffer = new Buffer(result.bytes);
    let promises = [
      context.scserver.callAndResponse(defRecv(buffer))
    ];
    if (properties.saveToDir) {
      promises.push(this._writeSynthDef(result.name, buffer, result.synthDesc, properties.saveToDir));
    }
    return Promise.all(promises).then(() => result);
  }

  _writeSynthDef(name:string, buffer:Buffer, synthDesc:Object, saveToDir:string) : Promise<*> {
    return new Promise((resolve, reject) => {
      let dir = path.resolve(saveToDir);
      let pathname = path.join(dir, name + '.scsyndef');
      fs.writeFile(pathname, buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          let descpath = path.join(dir, name + '.json');
          fs.writeFile(descpath, JSON.stringify(synthDesc, null, 2), (err2) => {
            err2 ? reject(err2) : resolve();
          });
        }
      });
    });
  }

  /**
   * Returns a Promise for a SynthDef result object: name, bytes, synthDesc
   */
  compileSource(context:Object, sourceCode:string, pathName:?string) {
    const wrappedCode = `{
      var def = { ${ sourceCode } }.value.asSynthDef;
      (
        name: def.name,
        synthDesc: def.asSynthDesc.asJSON(),
        bytes: def.asBytes()
      )
    }.value;`;
    return context.sclang.interpret(wrappedCode, undefined, false, false, true)
      .then((result:Object) => {
        return result;
      }, (error:SCLangError) => {
        error.annotate(`Failed to compile SynthDef  ${error.message} ${pathName || ''}`, {
          properties: this.properties,
          sourceCode
        });
        return Promise.reject(error);
      });
  }

  /**
   * Returns a Promise for a SynthDef result object: name, bytes, synthDesc
   */
  compileFrom(context:Object, sourcePath:string) : Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(path.resolve(sourcePath), (err, fileBuf) => {
        if (err) {
          reject(err);
        } else {
          this.compileSource(context, fileBuf.toString('ascii'), sourcePath).then(resolve, reject);
        }
      });
    });
  }

  add() : Object {
    return {
      run: (context, properties) => {
        if (properties.compileFrom && properties.watch) {
          // should use updater here
          context._watcher = fs.watch(path.resolve(properties.compileFrom),
            () => {
              return this.compileFrom(context, properties.compileFrom)
                .then((result:SclangResultType) => this._sendSynthDef(context, result));
            });
        }
      }
    };
  }

  remove() : Object {
    return {
      scserver: {
        // no need to do this if server has gone away
        msg: (context) => {
          if (context.synthDefName) {
            return defFree(context.synthDefName);
          }
        }
      },
      run: (context) => {
        if (context._watcher) {
          context._watcher.close();
          delete context._watcher;
        }
      }
    };
  }

  putSynthDef(context:Object, synthDefName:string, synthDesc:Object) {
    context.scserver.state.mutate(StateKeys.SYNTH_DEFS, (state) => {
      return state.set(synthDefName, synthDesc);
    });
  }

  /**
   * Return the value of this object, which is the synthDefName for use in /s_new.
   *
   * Could return the whole synthDef data object.
   */
  value(context:Object) : string {
    if (!context.synthDefName) {
      throw new Error('No synthDefName in context for SCSynthDef');
    }
    return context.synthDefName;
  }
}
