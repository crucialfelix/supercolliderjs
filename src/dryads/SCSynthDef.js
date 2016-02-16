
import {Dryad} from 'dryadic';
import {defRecv, defFree, defLoad} from '../server/osc/msg.js';
import path from 'path';
import fs from 'fs';

const StateKeys = {
  SYNTH_DEFS: 'SYNTH_DEFS'
};


/**
 * Compile a SynthDef from sclang source code
 */
export default class SCSynthDef extends Dryad {

  // saveTo, watch=false,
  // constructor(source, compileFrom, loadFrom, children=[]) {
  //   super({source, compileFrom, loadFrom}, children);
  // }

  requireParent() {
    return 'SCLang';
  }

  prepareForAdd() {
    if (this.properties.source) {
      return {
        synthDef: (context) => {
          return this.compileSource(context, this.properties.source)
            .then((result) => {
              return this.sendSynthDef(context, result);
            });
        }
      };
    }
    if (this.properties.compileFrom) {
      return {
        synthDef: (context) => {
          return this.compileFrom(context, this.properties.compileFrom)
            .then((result) => {
              return this.sendSynthDef(context, result);
            });
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

  sendSynthDef(context, result) {
    // name bytes
    // synthDefName should be set for child context
    this.putSynthDef(context, result.name, result.synthDesc);
    context.synthDefName = result.name;
    let buffer = new Buffer(result.bytes);
    return context.scserver.callAndResponse(defRecv(buffer)).then(() => result);
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

  remove() {
    return {
      scserver: {
        // no need to do this if server has gone away
        msg: (context) => {
          if (context.synthDefName) {
            return defFree(context.synthDefName);
          }
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
