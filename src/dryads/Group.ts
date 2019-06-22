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
  requireParent(): string {
    return 'SCServer';
  }

  prepareForAdd(): Object {
    return {
      callOrder: 'SELF_THEN_CHILDREN',
      updateContext: (context /*, properties*/) => {
        const nodeID = context.scserver.state.nextNodeID();
        return {
          nodeID,
          // TODO: but this overwrites my own group !
          // what if parent is a group ?
          // I need to create this group within that group
          // This should just be childContext,
          // but that is only called when creating the tree.
          group: nodeID,
          // for now, save it to parentGroup
          parentGroup: context.group || 0
        };
      }
    };
  }

  add(): Object {
    return {
      scserver: {
        msg: (context: Object) =>
          groupNew(context.nodeID, AddActions.TAIL, context.parentGroup)
      },
      run: (context: Object) =>
        whenNodeGo(context.scserver, context.id, context.nodeID)
    };
  }

  remove(): Object {
    return {
      scserver: {
        // children do not have to free their nodes
        // as they get freed by freeing this parent
        // so remove for children needs to communicate that somehow
        // but buffers and busses do need to free
        msg: (context: Object) => nodeFree(context.nodeID)
      },
      run: (context: Object) =>
        whenNodeEnd(context.scserver, context.id, context.nodeID)
    };
  }
}
