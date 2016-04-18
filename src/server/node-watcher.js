
import Immutable from 'immutable';
import * as _ from 'underscore';
import {Promise} from 'bluebird';

const keys = {
  NODE_WATCHER: 'NODE_WATCHER',
  NODES: 'NODES',
  CALLBACKS: 'CALLBACKS',
  ON_NODE_GO: 'ON_NODE_GO',
  ON_NODE_END: 'ON_NODE_END'
};

/**
server.state
  NODE_WATCHER
    ON_NODE_GO
      {nodeID}: [handlerId, ...]
    ON_NODE_END:
      {nodeID}: [handlerId, ...]
    CALLBACKS:
      {handlerId}: handler
    NODES:
      {nodeID}: info dict
**/

/**
 * Watch server OSC receive for any n_XXX messages
 * Save info for node and call any registered callbacks.
 *
 * Initially there is no need to unwatch unless you are
 * creating and discarding Server objects which can happen during testing.
 * TODO: add Server.destroy
 *
 * @param {Server} server
 * @returns {Rx.Disposable} - sub.dispose(); to turn it off.
 */
export function watchNodeNotifications(server) {
  // n_go
  // n_end
  // n_on
  // n_off
  // n_move
  // n_info
  var re = /^\/n_(go|end|on|off|move|info)$/;
  var stream = server.receive.filter((msg) => msg[0].match(re));
  var dispose = stream.subscribe((msg) => {
    var cmd = msg[0];
    var r = _responders[cmd];
    if (r) {
      r(server, msg.slice(1));
    }
  });
  return dispose;
}


/**
 * Call a function when the server sends an /n_go message
 * One callback allowed per id and node
 * The id is usually a context id but could be a random guid
 *
 * @param {Server} server
 * @param {String} id - unique id for this callback registration
 * @param {int} nodeID
 * @param {Function} handler
 * @returns {Function} - cancel function
 */
export function onNodeGo(server, id, nodeID, handler) {
  return _registerHandler(keys.ON_NODE_GO, server, id, nodeID, handler);
}


/**
 * Returns a Promise that resolves when the server sends an /n_go message
 * The id is usually a context id but could be a random guid
 *
 * @param {Server} server
 * @param {String} id - unique id for this callback registration
 * @param {int} nodeID
 * @returns {Promise} - resolves with nodeID
 */
export function whenNodeGo(server, id, nodeID) {
  return new Promise((resolve) => {
    onNodeGo(server, id, nodeID, () => resolve(nodeID));
  });
}


/**
 * Call a function when the server sends an /n_end message
 * One callback allowed per id and node.
 *
 * @param {Server} server
 * @param {String} id - unique id for this callback registration
 * @param {int} nodeID
 * @param {Function} handler
 * @returns {Function} - cancel function
 */
export function onNodeEnd(server, id, nodeID, handler) {
  return _registerHandler(keys.ON_NODE_END, server, id, nodeID, handler);
}


/**
 * Returns a Promise that resolves when the server sends an /n_end message
 * The id is usually a context id but could be a random guid
 */
export function whenNodeEnd(server, id, nodeID) {
  return new Promise((resolve) => {
    onNodeEnd(server, id, nodeID, () => resolve(nodeID));
  });
}


// function disposeForId(server, id) {
//   // remove all by matching the context id
//   throw new Error('Not Yet Implemented');
// }

/**
 * Update values in the Server's node state registery
 */
export function updateNodeState(server, nodeID, nodeState) {
  // unless its n_end then delete
  server.state.mutate(keys.NODE_WATCHER, (state) => {
    return state.mergeIn([keys.NODES, String(nodeID)],
      Immutable.Map(),
      nodeState);
  });
}

/***   @private  ************************************************/


function _registerHandler(type, server, id, nodeID, handler) {

  var dispose = () => {
    _disposeHandler(type, server, id, nodeID);
  };

  server.state.mutate(keys.NODE_WATCHER, (state) => {
    const handlerId = id + ':' + nodeID;

    return state
      .mergeDeep({
        [keys.CALLBACKS]: {
          [handlerId]: (...args) => {
            if ((type === keys.ON_NODE_GO) || (type === keys.ON_NODE_END)) {
              dispose();
            }
            handler.apply(this, args);
          }
        }})
      .updateIn(
        [type, String(nodeID)],
        Immutable.List(),
        (list) => list.push(handlerId));
  });

  return dispose;
}

/**
 * Delete a handler from state object
 */
function _disposeHandler(type, server, id, nodeID) {
  server.state.mutate(keys.NODE_WATCHER, (state) => {
    // why would I get undefined ??
    // probably no longer happens with new mutate
    // state = state || Immutable.Map();

    const handlerId = id + ':' + nodeID;

    return state
      .deleteIn([keys.CALLBACKS, handlerId])
      .updateIn(
        [type, String(nodeID)],
        Immutable.List(),
        (list) => list.filter((hid) => hid !== handlerId));
  });
}

function _handlersFor(server, type, nodeID) {
  return server.state.getIn([keys.NODE_WATCHER, type, String(nodeID)], Immutable.List())
    .map((handlerId) => {
      return server.state.getIn([keys.NODE_WATCHER, keys.CALLBACKS, handlerId]);
    });
}

function _saveNodeState(server, set, msg) {
  const nodeID = msg[0];
  var nodeState = {
    parent: msg[1],
    previous: msg[2],
    next: msg[3],
    isGroup: msg[4] > 0
  };
  if (nodeState.isGroup) {
    nodeState.head = msg[5];
    nodeState.tail = msg[6];
  }
  nodeState = _.assign(nodeState, set);
  updateNodeState(server, nodeID, nodeState);
}

/**
 * Call any handlers registered for n_XXX events
 */
function _callNodeHandlers(server, eventType, nodeID) {
  _handlersFor(server, eventType, nodeID).forEach((h) => h(nodeID));
}


/**
 * @private
 */
const _responders = {
  '/n_go': (server, args) => {
    _saveNodeState(server, {
      isPlaying: true,
      isRunning: true
    }, args);

    _callNodeHandlers(server, keys.ON_NODE_GO, args[0]);
  },
  '/n_end': (server, args) => {
    const nodeID = args[0];
    server.state.mutate(keys.NODE_WATCHER, (state) => {
      return state.deleteIn([keys.NODES, String(nodeID)]);
    });
    _callNodeHandlers(server, keys.ON_NODE_END, nodeID);
  },
  '/n_on': (server, args) => {
    _saveNodeState(server, {
      isRunning: true
    }, args);
  },
  '/n_off': (server, args) => {
    _saveNodeState(server, {
      isRunning: false
    }, args);
  },
  '/n_info': (server, args) => {
    _saveNodeState(server, {}, args);
  },
  '/n_move': (server, args) => {
    _saveNodeState(server, {}, args);
  }
};
