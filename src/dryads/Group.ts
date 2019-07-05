import { Dryad } from "dryadic";

import { whenNodeEnd, whenNodeGo } from "../server/node-watcher";
import { AddActions, groupNew, nodeFree } from "../server/osc/msg";
import Server from "../server/server.js";

interface Context {
  nodeID: number;
  group: number;
  parentGroup: number;
  scserver: Server;
  id: string;
}
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
    return "SCServer";
  }

  prepareForAdd(): object {
    return {
      callOrder: "SELF_THEN_CHILDREN",
      updateContext: (context: Context /*, properties*/) => {
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
          parentGroup: context.group || 0,
        };
      },
    };
  }

  add(): object {
    return {
      scserver: {
        msg: (context: Context) => groupNew(context.nodeID, AddActions.TAIL, context.parentGroup),
      },
      run: (context: Context) => whenNodeGo(context.scserver, context.id, context.nodeID),
    };
  }

  remove(): object {
    return {
      scserver: {
        // children do not have to free their nodes
        // as they get freed by freeing this parent
        // so remove for children needs to communicate that somehow
        // but buffers and busses do need to free
        msg: (context: Context) => nodeFree(context.nodeID),
      },
      run: (context: Context) => whenNodeEnd(context.scserver, context.id, context.nodeID),
    };
  }
}
