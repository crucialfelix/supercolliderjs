/* @flow */
import {Dryad} from 'dryadic';
import {synthNew, nodeFree, AddActions} from '../server/osc/msg';
import {whenNodeGo, whenNodeEnd, updateNodeState} from '../server/node-watcher';
import * as _  from 'lodash';


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
  requireParent() : string {
    return 'SCServer';
  }

  subgraph() {
    let def = this.properties.def;
    if (def && def.isDryad) {
      // wrap self as a child of SCSynthDef
      let d = def.clone();
      let m = this.clone();
      m.properties.def = null; // will get synthDefName from context
      d.children = [m];
      return d;
    }

    var sg = [];
    // clone and tag each one so they can be looked up during .add
    _.each(this.properties.args, (v, k) => {
      if (v.isDryad) {
        let nv = v.clone();
        nv.tag = k;
        sg.push(nv);
      }
    });

    sg.push(this);

    return new Dryad({}, sg);
  }

  prepareForAdd() {
    return {
      nodeID: (context) => context.scserver.state.nextNodeID(),
      synthDefName: (context) => {
        return this.synthDefName(context);
      }
    };
  }

  synthDefName(context) {
    // The parent SCSynthDef publishes both .synthDef (object) and .synthDefName to context
    let name = _.isString(this.properties.def) ? this.properties.def : context.synthDef.name;
    if (!name) {
      throw new Error('No synthDefName supplied to Synth', context);
    }
    return name;
  }

  add() {
    return {
      scserver: {
        msg: (context) => {
          let args = _.mapObject(this.properties.args, (v, k) => {
            if (v.isDryad) {
              // Each Dryad in args appears as a clone stored in context.subgraph
              // and has its own context there
              return this._checkOscType(context.subgraph[k].dryad.synthArg(context.subgraph[k].context));
            }

            // a simple function, is supplied context, should return a synthArg
            if (_.isFunction(v)) {
              return this._checkOscType(v(context));
            }

            return this._checkOscType(v);
          });
          return synthNew(context.synthDefName, context.nodeID, AddActions.TAIL, context.group, args);
        }
      },
      run: (context) => {
        return whenNodeGo(context.scserver, context.id, context.nodeID)
          .then((nodeID) => {
            updateNodeState(context.scserver, context.nodeID, {synthDef: context.synthDefName});
            return nodeID;
          });
      }
    };
  }

  remove() : Object {
    return {
      scserver: {
        msg: (context) => nodeFree(context.nodeID)
      },
      run: (context) => whenNodeEnd(context.scserver, context.id, context.nodeID)
    };
  }

  _checkOscType(v:any) : any {
    switch (typeof v) {
      case 'number':
        return v;
      default:
        throw new Error('Invalid type supplied to synthArgs: ' + (typeof v) + ' ' + v + ' ' + this);
    }
  }
}
