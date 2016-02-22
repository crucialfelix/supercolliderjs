
import {Dryad} from 'dryadic';
import {nodeFree, groupNew, AddActions} from '../server/osc/msg.js';
import {whenNodeGo, whenNodeEnd} from '../server/node-watcher';


/**
 * Creates a group on the server; sets .group in context for its children,
 * so any Synths or Groups will be spawned inside this group.
 */
export default class Group extends Dryad {

  constructor(children=[]) {
    super({}, children);
  }

  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent() {
    return 'SCServer';
  }

  prepareForAdd() {
    return (context) => {
      let nodeID = context.scserver.state.nextNodeID();
      return {
        nodeID: nodeID,
        parentGroup: context.group || 0,
        group: nodeID  // group for the children
      };
    };
  }

  add() {
    return {
      scserver: {
        msg: (context) => groupNew(context.nodeID, AddActions.TAIL, context.parentGroup)
      },
      run: (context) => whenNodeGo(context.scserver, context.id, context.nodeID)
    };
  }

  remove() {
    return {
      scserver: {
        // children do not have to free their nodes
        // as they get freed by freeing this parent
        // so remove for children needs to communicate that somehow
        // but buffers and busses do need to free
        msg: (context) => nodeFree(context.nodeID)
      },
      run: (context) => whenNodeEnd(context.scserver, context.id, context.nodeID)
    };
  }
}
