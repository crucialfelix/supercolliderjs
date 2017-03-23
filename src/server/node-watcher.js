/**
 * Functions for watching scsynth's node lifecycle notifications.
 *
 * Node states and metadata are stored in server.state, so most
 * useful information can be retrieved from there.
 *
 * These functions here are for registering callbacks.
 *
 * @flow
 * @module node-watcher
 *
 */
import { Map, List } from 'immutable';
import _ from 'lodash';
import { Promise } from 'bluebird';
import type { Disposable } from 'Rx';
import type Server from './server';
import type { NodeStateType } from '../Types';

const keys = {
  NODE_WATCHER: 'NODE_WATCHER',
  NODES: 'NODES',
  CALLBACKS: 'CALLBACKS',
  ON_NODE_GO: 'ON_NODE_GO',
  ON_NODE_END: 'ON_NODE_END'
};

/**
 * Watch server OSC receive for any n_XXX messages:
 *
 * - `n_go`
 * - `n_end`
 * - `n_on`
 * - `n_off`
 * - `n_move`
 * - `n_info`
 *
 * Save all of the supplied info for the node
 * and call any registered callbacks.
 *
 * Initially there is no need to unwatch unless you are
 * creating and discarding Server objects which can happen
 * during testing.
 *
 * TODO: add Server.destroy
 *
 * @param {Server} server
 * @returns {Rx.Disposable} - sub.dispose(); to turn it off.
 */
export function watchNodeNotifications(server: Server): Disposable {
  // n_go
  // n_end
  // n_on
  // n_off
  // n_move
  // n_info
  var re = /^\/n_(go|end|on|off|move|info)$/;
  var stream = server.receive.filter(msg => msg[0].match(re));
  var dispose = stream.subscribe(msg => {
    var cmd = msg[0];
    var r = _responders[cmd];
    if (r) {
      r(server, msg.slice(1));
    }
  });
  return dispose;
}

/**
 * Call a function when the server sends an `/n_go` message
 * One callback allowed per id and node
 * The id is usually a context id but could be a random guid
 *
 * @param {Server} server
 * @param {String} id - unique id for this callback registration
 * @param {int} nodeID
 * @param {Function} handler
 * @returns {Function} - cancel function
 */
export function onNodeGo(
  server: Server,
  id: string,
  nodeID: number,
  handler: Function
): Function {
  return _registerHandler(keys.ON_NODE_GO, server, id, nodeID, handler);
}

/**
 * Returns a Promise that resolves when the server sends an
 * `/n_go` message.
 *
 * The id is usually a context id (dryadic) but could be any random guid.
 * It can be anything you want to supply as long as it is unique.
 *
 * @param {Server} server
 * @param {String} id - unique id for this callback registration
 * @param {int} nodeID
 * @returns {Promise} - resolves with nodeID
 */
export function whenNodeGo(
  server: Server,
  id: string,
  nodeID: number
): Promise<number> {
  return new Promise(resolve => {
    onNodeGo(server, id, nodeID, () => resolve(nodeID));
  });
}

/**
 * Call a function when the server sends an `/n_end` message
 * One callback allowed per id and node.
 *
 * @param {Server} server
 * @param {String} id - unique id for this callback registration
 * @param {int} nodeID
 * @param {Function} handler
 * @returns {Function} - cancel function
 */
export function onNodeEnd(
  server: Server,
  id: string,
  nodeID: number,
  handler: Function
): Function {
  return _registerHandler(keys.ON_NODE_END, server, id, nodeID, handler);
}

/**
 * Returns a Promise that resolves when the server sends an `/n_end` message.
 *
 * The id is usually a context id but could be a random guid
 */
export function whenNodeEnd(
  server: Server,
  id: string,
  nodeID: number
): Promise<number> {
  return new Promise(resolve => {
    onNodeEnd(server, id, nodeID, () => resolve(nodeID));
  });
}

// function disposeForId(server:Server, id) {
//   // remove all by matching the context id
//   throw new Error('Not Yet Implemented');
// }

/**
 * Update values in the Server's node state registery.
 *
 * This is for internal use.
 */
export function updateNodeState(
  server: Server,
  nodeID: number,
  nodeState: NodeStateType
) {
  // unless its n_end then delete
  server.state.mutate(keys.NODE_WATCHER, state => {
    return state.mergeIn([keys.NODES, String(nodeID)], Map(), nodeState);
  });
}

/**
 * @private
 */
function _registerHandler(
  type,
  server: Server,
  id: string,
  nodeID: number,
  handler: Function
): Function {
  var dispose = () => {
    _disposeHandler(type, server, id, nodeID);
  };

  server.state.mutate(keys.NODE_WATCHER, state => {
    const handlerId = id + ':' + nodeID;

    return state
      .mergeDeep({
        [keys.CALLBACKS]: {
          [handlerId]: (...args) => {
            if (type === keys.ON_NODE_GO || type === keys.ON_NODE_END) {
              dispose();
            }
            handler.apply(this, args);
          }
        }
      })
      .updateIn([type, String(nodeID)], List(), list => list.push(handlerId));
  });

  return dispose;
}

/**
 * Delete a handler from state object.
 *
 * @private
 */
function _disposeHandler(type, server: Server, id, nodeID: number) {
  server.state.mutate(keys.NODE_WATCHER, state => {
    // why would I get undefined ??
    // probably no longer happens with new mutate
    // state = state || Map();

    const handlerId = id + ':' + nodeID;

    return state
      .deleteIn([keys.CALLBACKS, handlerId])
      .updateIn([type, String(nodeID)], List(), list =>
        list.filter(hid => hid !== handlerId));
  });
}

/**
 * @private
 */
function _handlersFor(server: Server, type, nodeID: number) {
  return server.state
    .getIn([keys.NODE_WATCHER, type, String(nodeID)], List())
    .map(handlerId => {
      return server.state.getIn([keys.NODE_WATCHER, keys.CALLBACKS, handlerId]);
    });
}

/**
 * @private
 */
function _saveNodeState(server: Server, set, msg) {
  const nodeID = msg[0];
  const isGroup = msg[4] > 0;
  var nodeState: NodeStateType = {
    parent: msg[1],
    previous: msg[2],
    next: msg[3],
    isGroup: isGroup,
    head: isGroup ? msg[5] : null,
    tail: isGroup ? msg[6] : null
  };
  nodeState = _.assign(nodeState, set);
  updateNodeState(server, nodeID, nodeState);
}

/**
 * Call any handlers registered for n_XXX events.
 *
 * @private
 */
function _callNodeHandlers(server: Server, eventType, nodeID: number) {
  _handlersFor(server, eventType, nodeID).forEach(h => h(nodeID));
}

/**
 * @private
 */
const _responders = {
  '/n_go': (server: Server, args) => {
    _saveNodeState(
      server,
      {
        isPlaying: true,
        isRunning: true
      },
      args
    );

    _callNodeHandlers(server, keys.ON_NODE_GO, args[0]);
  },
  '/n_end': (server: Server, args) => {
    const nodeID = args[0];
    server.state.mutate(keys.NODE_WATCHER, state => {
      return state.deleteIn([keys.NODES, String(nodeID)]);
    });
    _callNodeHandlers(server, keys.ON_NODE_END, nodeID);
  },
  '/n_on': (server: Server, args) => {
    _saveNodeState(
      server,
      {
        isRunning: true
      },
      args
    );
  },
  '/n_off': (server: Server, args) => {
    _saveNodeState(
      server,
      {
        isRunning: false
      },
      args
    );
  },
  '/n_info': (server: Server, args) => {
    _saveNodeState(server, {}, args);
  },
  '/n_move': (server: Server, args) => {
    _saveNodeState(server, {}, args);
  }
};
