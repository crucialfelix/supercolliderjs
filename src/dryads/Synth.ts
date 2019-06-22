/* @flow */
import { Dryad } from 'dryadic';
import { synthNew, nodeFree, AddActions } from '../server/osc/msg';
import {
  whenNodeGo,
  whenNodeEnd,
  updateNodeState
} from '../server/node-watcher';
import _ from 'lodash';

/**
 * Creates a synth on the server.
 *
 * Properties:
 * - def
 * - args
 */
export default class Synth extends Dryad {
  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent(): string {
    return 'SCServer';
  }

  prepareForAdd(): Object {
    return {
      updateContext: context => ({
        nodeID: context.scserver.state.nextNodeID()
      })
    };
  }

  // synthDefName(context:Object) : string {
  //   // The parent SCSynthDef publishes both .synthDef (object) and .synthDefName to context
  //   let name = _.isString(this.properties.def) ? this.properties.def : (context.synthDef && context.synthDef.name);
  //   if (!name) {
  //     throw new Error('No synthDefName supplied to Synth', context);
  //   }
  //   return name;
  // }

  add(): Object {
    return {
      scserver: {
        msg: (context, properties) => {
          let args = _.mapValues(properties.args, (value, key) =>
            this._checkOscType(value, key, context.id));
          // if out is not set in args and out is in synthdef
          // then set it from context
          // TODO: check that synthDef has an arg named out
          if (_.isUndefined(args.out) && !_.isUndefined(context.out)) {
            args.out = context.out;
          }

          let defName = this._checkOscType(
            properties.def && properties.def.name,
            'def.name',
            context.id
          );
          return synthNew(
            defName,
            context.nodeID,
            AddActions.TAIL,
            context.group,
            args
          );
        }
      },
      run: (context, properties) => {
        return whenNodeGo(
          context.scserver,
          context.id,
          context.nodeID
        ).then(nodeID => {
          // TODO: call a method instead so its testable
          updateNodeState(context.scserver, context.nodeID, {
            synthDef: properties.def.name
          });
          return nodeID;
        });
      }
    };
  }

  remove(): Object {
    return {
      scserver: {
        msg: context => nodeFree(context.nodeID)
      },
      run: context => whenNodeEnd(context.scserver, context.id, context.nodeID)
    };
  }

  _checkOscType(v: any, key: string, id: string): any {
    switch (typeof v) {
      case 'number':
      case 'string':
        // case 'Buffer':
        return v;
      default:
        throw new Error(
          `Invalid OSC type for Synth ${key}: [${typeof v}: ${v}] @ ${id}`
        );
    }
  }
}
