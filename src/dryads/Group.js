/* @flow */
import { Dryad } from 'dryadic';
import { nodeFree, groupNew, AddActions } from '../server/osc/msg.js';
import { whenNodeGo, whenNodeEnd } from '../server/node-watcher';


/**
 * Creates a group on the server; sets .group in context for its children,
 * so any Synths or Groups will be spawned inside this group.
 */
export default class Group extends Dryad {

  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent() : string {
    return 'SCServer';
  }

  prepareForAdd() : Object {
    return {
      updateContext: (context/*, properties*/) => ({
        nodeID: context.scserver.state.nextNodeID(),
        parentGroup: context.group || 0,
        // TODO: but this overwrites my own group !
        // what if parent is a group ?
        group: context.nodeID
      })
    };
  }

  add() : Object {
    return {
      scserver: {
        msg: (context:Object) => groupNew(context.nodeID, AddActions.TAIL, context.parentGroup)
      },
      run: (context:Object) => whenNodeGo(context.scserver, context.id, context.nodeID)
    };
  }

  remove() : Object {
    return {
      scserver: {
        // children do not have to free their nodes
        // as they get freed by freeing this parent
        // so remove for children needs to communicate that somehow
        // but buffers and busses do need to free
        msg: (context:Object) => nodeFree(context.nodeID)
      },
      run: (context:Object) => whenNodeEnd(context.scserver, context.id, context.nodeID)
    };
  }
}
