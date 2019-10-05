import { Dryad } from "dryadic";
import _ from "lodash";

import Server, { OscType, updateNodeState, whenNodeEnd, whenNodeGo, msg } from "@supercollider.js/server";
import { SynthDef } from "./SCSynthDef";

const { AddActions, nodeFree, synthNew } = msg;

interface SynthParams {
  [name: string]: OscType | Dryad;
}

interface Properties {
  args: SynthParams;
  def: SynthDef | string;
}
interface Context {
  id: string;
  out?: number;
  nodeID?: number;
  group?: number;
  scserver: Server;
}

/**
 * Creates a synth on the server.
 *
 * Properties:
 * - def
 * - args
 */
export default class Synth extends Dryad<Properties> {
  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent(): string {
    return "SCServer";
  }

  prepareForAdd(): object {
    return {
      updateContext: context => ({
        nodeID: context.scserver.state.nextNodeID(),
      }),
    };
  }

  // synthDefName(context:object) : string {
  //   // The parent SCSynthDef publishes both .synthDef (object) and .synthDefName to context
  //   let name = _.isString(this.properties.def) ? this.properties.def : (context.synthDef && context.synthDef.name);
  //   if (!name) {
  //     throw new Error('No synthDefName supplied to Synth', context);
  //   }
  //   return name;
  // }

  add(): object {
    const defName = def => (typeof def === "string" ? def : def.name);
    return {
      scserver: {
        msg: (context: Context, properties: Properties) => {
          const args = _.mapValues(properties.args, (value, key) => this._checkOscType(value, key, context.id));
          // if out is not set in args and out is in synthdef
          // then set it from context
          // TODO: check that synthDef has an arg named out
          if (_.isUndefined(args.out) && !_.isUndefined(context.out)) {
            args.out = context.out;
          }

          const dn = this._checkOscType(defName(properties.def), "def.name", context.id);
          return synthNew(dn, context.nodeID, AddActions.TAIL, context.group, args);
        },
      },
      run: (context: Context, properties: Properties): void | Promise<number> => {
        return whenNodeGo(context.scserver, context.id, context.nodeID || -1).then(nodeID => {
          // TODO: call a method instead so its testable
          updateNodeState(context.scserver, nodeID, {
            synthDef: defName(properties.def),
          });
          return nodeID;
        });
      },
    };
  }

  remove(): object {
    return {
      scserver: {
        msg: (context: Context) => nodeFree(context.nodeID || -1),
      },
      run: (context: Context) => whenNodeEnd(context.scserver, context.id, context.nodeID || -1),
    };
  }

  _checkOscType(v: any, key: string, id: string): any {
    switch (typeof v) {
      case "number":
      case "string":
        // case 'Buffer':
        return v;
      default:
        throw new Error(`Invalid OSC type for Synth ${key}: [${typeof v}: ${v}] @ ${id}`);
    }
  }
}
