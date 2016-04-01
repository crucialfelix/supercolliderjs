
import {Dryad} from 'dryadic';
import {defRecv, defFree, defLoad} from '../server/osc/msg.js';
import path from 'path';
import fs from 'fs';

const StateKeys = {
  SYNTH_DEFS: 'SYNTH_DEFS'
};


/**
 * Compile a SynthDef from sclang source code
 *
 * `synthDef` is set in the context for children Dryads to access.
 * It is an object:
 * - .name
 * - .bytes
 * - .synthDesc object with descriptive meta data
 *
 * `synthDefName` is set in context for children Dryads
 *
 * options:
 *  - source      - sclang source code to compile
 *  - compileFrom - path of .scd file to compile
 *  - watch       - watch compileFrom file and recompile on changes
 *  - saveToDir   - path to save compiled .scsyndef to after compiling
 *  - loadFrom    - path of .scsyndef file to load to server
 */
export default class SCSynthDef extends Dryad {

  // saveToDir, watch=false,
  // constructor(source, compileFrom, loadFrom, children=[]) {
  //   super({source, compileFrom, loadFrom}, children);
  // }

  /**
   * If there is no SCLang in the parent context,
   * then this will wrap itself in an SCLang (language interpreter).
   */
  requireParent() {
    return 'SCLang';
  }

  prepareForAdd() {
    if (this.properties.source) {
      return {
        synthDef: (context) => {
          return this.compileSource(context, this.properties.source)
            .then((result) => this._sendSynthDef(context, result));
        }
      };
    }
    if (this.properties.compileFrom) {
      return {
        synthDef: (context) => {
          return this.compileFrom(context, this.properties.compileFrom)
            .then((result) => this._sendSynthDef(context, result));
        }
      };
    }
    let lf = this.properties.loadFrom;
    if (lf) {
      return {
        synthDef: (context) => {
          let result = {
            name: path.basename(lf, path.extname(lf))
          };
          return context.scserver
            .callAndResponse(defLoad(path.resolve(lf)))
              .then(() => result);
        }
      };
    }
    return {};
  }

  _sendSynthDef(context, result) {
    // name bytes
    // synthDefName should be set for child context
    this.putSynthDef(context, result.name, result.synthDesc);
    context.synthDefName = result.name;
    let buffer = new Buffer(result.bytes);
    let promises = [
      context.scserver.callAndResponse(defRecv(buffer))
    ];
    if (this.properties.saveToDir) {
      promises.push(this._writeSynthDef(result.name, buffer, result.synthDesc, this.properties.saveToDir));
    }
    return Promise.all(promises).then(() => result);
  }

  _writeSynthDef(name, buffer, synthDesc, saveToDir) {
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
  compileSource(context, sourceCode) {
    var wrappedCode = `{
      var def = { ${ sourceCode } }.value.asSynthDef;
      (
        name: def.name,
        synthDesc: def.asSynthDesc.asJSON(),
        bytes: def.asBytes()
      )
    }.value;`;
    return context.sclang.interpret(wrappedCode, undefined, false, false, true)
      .then((result) => {
        return result;
      }, (error) => {
        return Promise.reject({
          description: `Failed to compile SynthDef`,
          error: error.error,
          sourceCode: sourceCode
        });
      });
  }

  /**
   * Returns a Promise for a SynthDef result object: name, bytes, synthDesc
   */
  compileFrom(context, sourcePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(path.resolve(sourcePath), (err, fileBuf) => {
        if (err) {
          reject(err);
        } else {
          this.compileSource(context, fileBuf.toString('ascii')).then(resolve, reject);
        }
      });
    });
  }

  add() {
    if (this.properties.compileFrom && this.properties.watch) {
      return {
        run: (context) => {
          context._watcher = fs.watch(path.resolve(this.properties.compileFrom), () => {
            this.compileFrom(context, this.properties.compileFrom)
              .then((result) => this._sendSynthDef(context, result));
          });
        }
      };
    }
    return {};
  }

  remove() {
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

  putSynthDef(context, synthDefName, synthDesc) {
    context.scserver.state.mutate(StateKeys.SYNTH_DEFS, (state) => {
      return state.set(synthDefName, synthDesc);
    });
  }
}
