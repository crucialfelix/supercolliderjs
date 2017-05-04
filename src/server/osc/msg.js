/**
  * Functions that format OSC message arrays
  * For OSC commands that have an asynchronous response
  * the function returns a {call: response: } object
  * to make it easy to map directly to a calling function.
  *
  * @flow
  * @module msg
  */
import _ from 'lodash';

import { MsgType, CallAndResponseType, PairsType } from '../../Types';

/**
  * Add actions for specifying relationship of newly adding node
  * to its targetID
  *
  * - 0 add the new group to the the head of the group specified by the add target ID.
  * - 1 add the new group to the the tail of the group specified by the add target ID.
  * - 2 add the new group just before the node specified by the add target ID.
  * - 3 add the new group just after the node specified by the add target ID.
  *  - 4 the new node replaces the node specified by the add target ID. The target node is freed.
  *  @memberof msg
 */
export const AddActions: Object = {
  HEAD: 0,
  TAIL: 1,
  BEFORE: 2,
  AFTER: 3,
  REPLACE: 4
};

function flattenPairs(pairs: PairsType): MsgType {
  return _.flatten(_.isObject(pairs) ? _.toPairs(pairs) : pairs);
}

/**
  * Tell server to exit
  *
  * @return {Array} - OSC message
  */
export function quit(): MsgType {
  return ['/quit'];
}

/**
  * Register to receive notifications from server

  * Asynchronous. Replies with `/done /notify clientID`. If this client has registered for notifications before, this may be the same ID. Otherwise it will be a new one. Clients can use this ID in multi-client situations to avoid conflicts in node IDs, bus indices, buffer numbers, etc.

  * @param {int} on - start or stop
    If argument is 1, server will remember your return address and send you notifications. 0 will stop sending notifications.
  * @return {Array} - OSC message
  */
export function notify(on: number = 1): CallAndResponseType {
  return {
    call: ['/notify', on],
    response: ['/done', '/notify'] // => clientID
  };
}

/**
  * Query for server status.

  * Server replies with `/status.reply`

  * @return {Array} - OSC message
  */
export function status(): CallAndResponseType {
  return {
    call: ['/status'],
    response: ['/status.reply'] // => status array
  };
}

/**
  * Execute a command defined by a UGen Plug-in
  *
  * @return {Array} - OSC message
  */
export function cmd(command: number, args: MsgType = []): MsgType {
  return ['/cmd', command].concat(args);
}

/**
  * Dump incoming OSC messages to stdout
  * @param {int} code -
  * 0 turn dumping OFF.
  * 1 print the parsed contents of the message.
  * 2 print the contents in hexadecimal.
  * 3 print both the parsed and hexadecimal representations of the contents.
  * @return {Array} - OSC message
  */
export function dumpOSC(code: number = 1): MsgType {
  return ['/dumpOSC', code];
}

/**
  * Notify when async commands have completed.
  *
  * Replies with a `/synced` message when all asynchronous commands received before this one have completed. The reply will contain the sent unique ID.
  *
  * Asynchronous. Replies with `/synced ID` .
  *
  * @param {int} id - a unique number identifying this command.
  * @return {Array} - OSC message
  */
export function sync(id: number): CallAndResponseType {
  return {
    call: ['/sync', id],
    response: ['/synced', id]
  };
}

/**
  * Clear all scheduled bundles. Removes all bundles from the scheduling queue.
  *
  * @return {Array} - OSC message
  */
export function clearSched(): MsgType {
  return ['/clearSched'];
}

/**
  * Enable/disable error message posting.
  * @param {int} on
  * @return {Array} - OSC message
  */
export function error(on: number = 1): MsgType {
  return ['/error', on];
}

/**** Synth Definition Commands **  */

/**
  * Loads a file of synth definitions from a data buffer included in the message. Resident definitions with the same names are overwritten.
  *
  * Asynchronous. Replies with `/done`.
  *
  * @param {Buffer} buffer - A node global datatype: new Buffer(array)
  * @param {Array} completionMsg
  * @return {Array} - OSC message
  *
  */
export function defRecv(
  buffer: Buffer,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: ['/d_recv', buffer, completionMsg],
    response: ['/done', '/d_recv']
  };
}

/**
  * Load synth definition.
  *
  * Loads a file of synth definitions. Resident definitions with the same names are overwritten.
  * Asynchronous. Replies with `/done`.

  * @param {String} path
  * @param {Array} completionMsg
  * @return {Array} - OSC message
  */
export function defLoad(
  path: string,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: ['/d_load', path, completionMsg],
    response: ['/done']
  };
}

/**
  * Load a directory of synth definitions.
  *
  * Asynchronous. Replies with `/done`.
  *
  * @param {String} path
  * @param {Array} completionMsg
  * @return {Array} - OSC message
  */
export function defLoadDir(
  path: string,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: ['/d_loadDir', path, completionMsg],
    response: ['/done']
  };
}

/**
  * Delete synth definition.
  *
  * The definition is removed immediately, and does not wait for synth nodes based on that definition to end.
  *
  * @param {String} defName
  * @return {Array} - OSC message
  */
export function defFree(defName: string): MsgType {
  return ['/d_free', defName];
}

/******* Node Commands **********************  */

/**
  * Delete/free a node
  * @param {int} nodeID
  * @return {Array} - OSC message
  */
export function nodeFree(nodeID: number): MsgType {
  return ['/n_free', nodeID];
}

/**
  * Stop/start a node from running
  *
  * Save computation by turning a node (and its children) off
  * but without removing it from the UGen graph
  * @param {int} nodeID
  * @param {int} on - binary boolean
  * @return {Array} - OSC message
  */
export function nodeRun(nodeID: number, on: number = 1): MsgType {
  return ['/n_run', nodeID, on];
}

/**
  * Set a node's control value(s).
  *
  * Takes a list of pairs of control indices and values and sets the controls to
  * those values. If the node is a group, then it sets the controls of every node
  * in the group.
  *
  * This message now supports array type tags (`$[` and `$]`) in the control/value
  * component of the OSC message.  Arrayed control values are applied in the
  * manner of `n_setn` (i.e., sequentially starting at the indexed or named control).
  *
  * I think this also takes `[freq, 440]`
  *
  * @example
  * ```js
  *  nodeSet(id, [[0, 440], ...])
  *  ```
  *
  * @param {int} nodeID
  * @param {Object|Array} pairs - `[[key, value], ...]` or `{key: value, ...}`
  * @return {Array} - OSC message
  */
export function nodeSet(nodeID: number, pairs: PairsType): MsgType {
  return ['/n_set', nodeID].concat(flattenPairs(pairs));
}

/**
  * Set ranges of a node's control value(s).
  *
  * Set contiguous ranges of control indices to sets of values. For each range,
  * the starting control index is given followed by the number of controls to change,
  * followed by the values. If the node is a group, then it sets the controls of every
  * node in the group.
  *
  * @param {int} nodeID -
  * @param {Array} valueSets - `[[controlName|index, numValues, value1, ... valueN], ...]`
  * @return {Array} - OSC message
  */
export function nodeSetn(nodeID: number, valueSets: PairsType = []): MsgType {
  return ['/n_setn', nodeID].concat(_.flatten(valueSets));
}

/**
  * Fill ranges of a node's control value(s).
  *
  * Set contiguous ranges of control indices to single values. For each range,
  * the starting control index is given followed by the number of controls to
  * change, followed by the value to fill. If the node is a group, then it
  * sets the controls of every node in the group.
  *
  * @param {int} nodeID -
  * @param {Array} triples - `[[key, numValuesToFill, value], ...]`
  * @return {Array} - OSC message
  */
export function nodeFill(nodeID: number, triples: PairsType = []): MsgType {
  return ['/n_fill', nodeID].concat(_.flatten(triples));
}

/**
  * Map a node's controls to read from a bus.
  *
  * @param {int} nodeID -
  * @param {Array|Object} pairs - `[[controlName, busID], ...]`
  * @return {Array} - OSC message
  *
  * Takes a list of pairs of control names or indices and bus indices and causes those controls to be read continuously from a global control bus. If the node is a group, then it maps the controls of every node in the group. If the control bus index is -1 then any current mapping is undone. Any n_set, n_setn and n_fill command will also unmap the control.
  */
export function nodeMap(nodeID: number, pairs: PairsType = []): MsgType {
  return ['/n_map', nodeID].concat(flattenPairs(pairs));
}

/**
  * Map a node's controls to read from buses.
  *
  * Takes a list of triples of control names or indices, bus indices, and number of controls to map and causes those controls to be mapped sequentially to buses. If the node is a group, then it maps the controls of every node in the group. If the control bus index is -1 then any current mapping is undone. Any n_set, n_setn and n_fill command will also unmap the control.
  *
  * @param {int} nodeID -
  * @param {Array} triples - `[[controlName|index, busID, numControlsToMap], ...]`
  * @return {Array} - OSC message

  */
export function nodeMapn(nodeID: number, triples: PairsType = []): MsgType {
  return ['/n_mapn', nodeID].concat(_.flatten(triples));
}

/**
 * Map a node's controls to read from an audio bus.
 *
 * Takes a list of pairs of control names or indices and audio bus indices and causes those controls to be read continuously from a global audio bus. If the node is a group, then it maps the controls of every node in the group. If the audio bus index is -1 then any current mapping is undone. Any n_set, n_setn and n_fill command will also unmap the control. For the full audio rate signal, the argument must have its rate set to \ar.
  *
  * @param {int} nodeID -
  * @param {Array} pairs - `[[controlName|index, audioBusID], ...]`
  * @return {Array} - OSC message
  */
export function nodeMapAudio(nodeID: number, pairs: PairsType): MsgType {
  return ['/n_mapa', nodeID].concat(flattenPairs(pairs));
}

/**
  * Map a node's controls to read from audio buses.
  *
  * @param {int} nodeID -
  * @param {Array} triples - `[[controlName|index, audioBusID, numControlsToMap], ...]`
  * @return {Array} - OSC message
  *
  * Takes a list of triples of control names or indices, audio bus indices, and number of controls to map and causes those controls to be mapped sequentially to buses. If the node is a group, then it maps the controls of every node in the group. If the audio bus index is -1 then any current mapping is undone. Any `n_set`, `n_setn` and `n_fill` command will also unmap the control. For the full audio rate signal, the argument must have its rate set to `\ar`.
  */
export function nodeMapAudion(
  nodeID: number,
  triples: PairsType = []
): MsgType {
  return ['/n_mapan', nodeID].concat(_.flatten(triples));
}

/**
  * Places node A in the same group as node B, to execute immediately before node B.
  *
  * @param {int} moveNodeID - the node to move (A)
  * @param {int} beforeNodeID - the node to move A before
  * @return {Array} - OSC message
  */
export function nodeBefore(moveNodeID: number, beforeNodeID: number): MsgType {
  return ['/n_before', moveNodeID, beforeNodeID];
}

/**
  * Places node A in the same group as node B, to execute immediately after node B.
  *
  * @param {int} moveNodeID - the ID of the node to place (A)
  * @param {int} afterNodeID - the ID of the node after which the above is placed (B)
  * @return {Array} - OSC message
  */
export function nodeAfter(moveNodeID: number, afterNodeID: number): MsgType {
  return ['/n_after', moveNodeID, afterNodeID];
}

/**
  * Get info about a node.
  *
  * The server sends an `/n_info` message for each node to registered clients.
  * See Node Notifications for the format of the `/n_info` message.
  *
  * @param {int} nodeID
  * @return {Array} - OSC message
  */
export function nodeQuery(nodeID: number): CallAndResponseType {
  return {
    call: ['/n_query', nodeID],
    response: ['/n_info', nodeID]
  };
}

/**
  * Trace a node.
  *
  * Causes a synth to print out the values of the inputs and outputs of its unit generators for one control period. Causes a group to print the node IDs and names of each node in the group for one control period.
  *
  * @param {int} nodeID
  * @return {Array} - OSC message
  */
export function nodeTrace(nodeID: number): MsgType {
  return ['/n_trace', nodeID];
}

/**
  * Move and order a list of nodes.
  *
  * Move the listed nodes to the location specified by the target and add action, and place them in the order specified. Nodes which have already been freed will be ignored.
  *
  * @param {int} addAction
  * @param {int} targetID
  * @param {Array.<int>} nodeIDs
  * @return {Array} - OSC message
  */
export function nodeOrder(
  addAction: number,
  targetID: number,
  nodeIDs: [number]
): MsgType {
  return ['/n_order', addAction, targetID].concat(nodeIDs);
}

/***** Synth Commands  **  */

/**
  * Create a new synth.

  Create a new synth from a named, compiled and already loaded synth definition, give it an ID, and add it to the tree of nodes.

  There are four ways to add the node to the tree as determined by the add action argument

  Controls may be set when creating the synth. The control arguments are the same as for the `n_set` command.

  If you send `/s_new` with a synth ID of -1, then the server will generate an ID for you. The server reserves all negative IDs. Since you don't know what the ID is, you cannot talk to this node directly later. So this is useful for nodes that are of finite duration and that get the control information they need from arguments and buses or messages directed to their group. In addition no notifications are sent when there are changes of state for this node, such as `/n_go`, `/n_end`, `/n_on`, `/n_off`.

  If you use a node ID of -1 for any other command, such as `/n_map`, then it refers to the most recently created node by `/s_new` (auto generated ID or not). This is how you can map  the controls of a node with an auto generated ID. In a multi-client situation, the only way you can be sure what node -1 refers to is to put the messages in a bundle.

  This message now supports array type tags (`$[` and `$]`) in the control/value component of the OSC message.  Arrayed control values are applied in the manner of n_setn (i.e., sequentially starting at the indexed or named control). See the linkGuides/NodeMessaging helpfile.

  * @param {Object} args
  * - key: a control index or name
  * - value: floating point and integer arguments are interpreted
  *          as control value.
  * A symbol argument consisting of the letter 'c' or 'a' (for control or audio) followed by the bus's index.
  * @return OSC message
  */
export function synthNew(
  defName: string,
  nodeID: number = -1,
  addAction: number = AddActions.TAIL,
  targetID: number = 0,
  args: PairsType = []
): MsgType {
  return ['/s_new', defName, nodeID, addAction, targetID].concat(
    flattenPairs(args)
  );
}

/**
  * Get control value(s).

  * @param {int} synthID
  * @param {Array.<int|String>} controlNames - index or names
  * @return {Array} - OSC message

  Replies with the corresponding `/n_set` command.
  */
export function synthGet(
  synthID: number,
  controlNames: [number | string]
): CallAndResponseType {
  return {
    call: ['/s_get', synthID].concat(controlNames),
    response: ['/n_set', synthID]
  };
}

/**
  Get ranges of control value(s).

  * @param {int} synthID
  * @param {int|String} controlName - a control index or name
  * @param {int} n - number of sequential controls to get (M)
  * @return {Array} - OSC message

  Get contiguous ranges of controls. Replies with the corresponding `/n_setn` command.
  */
export function synthGetn(
  synthID: number,
  controlName: number | string,
  n: number
): CallAndResponseType {
  return {
    call: ['/s_getn', synthID, controlName, n],
    response: ['/n_setn', synthID]
  };
}

/**
  * Auto-reassign synths' ID to a reserved value.

  This command is used when the client no longer needs to communicate with the synth and wants to have the freedom to reuse the ID. The server will reassign this synth to a reserved negative number. This command is purely for bookkeeping convenience of the client. No notification is sent when this occurs.

  * @param {Array} synthIDs
  * @return {Array} - OSC message
  */
export function synthNoid(synthIDs: [number]): MsgType {
  return ['/s_noid'].concat(synthIDs);
}

/****** Group Commands ***  */

/**
  Create a new group.

  Create a new group and add it to the tree of nodes.
  There are four ways to add the group to the tree as determined by the add action argument

  * @param {int} nodeID - new group ID
  * @param {int} addAction
  * @param {int} targetID
  * @return {Array} - OSC message
  */
export function groupNew(
  nodeID: number,
  addAction: number = AddActions.HEAD,
  targetID: number = 0
): MsgType {
  return [
    '/g_new',
    nodeID,
    _.isUndefined(addAction) ? AddActions.HEAD : addAction,
    targetID || 0
  ];
}

/**
  Create a new parallel group.  supernova only

  Create a new parallel group and add it to the tree of nodes. Parallel groups are relaxed groups, their child nodes are evaluated in unspecified order.
  There are four ways to add the group to the tree as determined by the add action argument

  Multiple groups may be created in one command by adding arguments. (not implemented here)

  * @param {int} groupID - new group ID
  * @param {int} addAction - add action
  * @param {int} targetID
  * @return {Array} - OSC message
  */
export function parallelGroupNew(
  groupID: number,
  addAction: number = AddActions.HEAD,
  targetID: number = 0
): MsgType {
  return ['/p_new', groupID, addAction, targetID];
}

/**
  * Moves node to the head (first to be executed) of the group.
  *
  * @param {int} groupID
  * @param {int} nodeID
  * @param {...int} rest - more node IDs to also move to head
  * @return {Array} - OSC message
  */
export function groupHead(
  groupID: number,
  nodeID: number,
  ...rest: Array<number>
): MsgType {
  return ['/g_head', groupID, nodeID].concat(rest);
}

/**
  * Moves node to the tail (last to be executed) of the group.

  * @param {int} groupID
  * @param {int} nodeID
  * @param {...int} rest - more node IDs to also move to tail
  * @return {Array} - OSC message
  */
export function groupTail(
  groupID: number,
  nodeID: number,
  ...rest: Array<number>
): MsgType {
  return ['/g_tail', groupID, nodeID].concat(rest);
}

/**
  Frees all immediate children nodes in the group

  * @param {int} groupID
  * @return {Array} - OSC message
  */
export function groupFreeAll(groupID: number): MsgType {
  return ['/g_freeAll', groupID];
}

/**
  * Free all synths in this group and all its sub-groups.
  *
  * Traverses all groups below this group and frees all the synths. Sub-groups are not freed.
  *
  * @param {int} groupID
  * @return {Array} - OSC message
  */
export function groupDeepFree(groupID: number): MsgType {
  return ['/g_deepFree', groupID];
}

/**
  * Post a representation of this group's node subtree to STDOUT

  Posts a representation of this group's node subtree, i.e. all the groups and synths contained within it, optionally including the current control values for synths.

  * @param {int} groupID
  * @param {int} dumpControlValues -   if not 0 post current control (arg) values for synths to STDOUT
  * @return {Array} - OSC message
  *
  */
export function groupDumpTree(
  groupID: number,
  dumpControlValues: number = 0
): MsgType {
  return ['/g_dumpTree', groupID, dumpControlValues];
}

/**
  * Get a representation of this group's node subtree.

  Request a representation of this group's node subtree, i.e. all the groups and synths contained within it. Replies to the sender with a `/g_queryTree.reply` message listing all of the nodes contained within the group in the following format:

  * param {int} - flag: if synth control values are included 1, else 0
  * param {int} nodeID - of the requested group
  * param {int} - number of child nodes contained within the requested group
  * then for each node in the subtree:
      * param {int} nodeID -
      * param {int} - number of child nodes contained within this node. If -1 this is a synth, if >=0 it's a group
      * then, if this node is a synth:
      * strongsymbol the SynthDef name for this node.
    * then, if flag (see above) is true:
      * param {int} - numControls for this synth (M)
      * multiple:
          * param {string|int} - control name or index
          * param {float|String} value or control bus mapping symbol (e.g. 'c1')


  * N.B. The order of nodes corresponds to their execution order on the server. Thus child nodes (those contained within a group) are listed immediately following their parent. See the method Server:queryAllNodes for an example of how to process this reply.
  *

  * @param {int} groupID
  * @param {int} dumpControlValues -  if not 0 the current control (arg) values for synths will be included
  * @return {Array} - OSC message
  */
export function groupQueryTree(
  groupID: number,
  dumpControlValues: number = 0
): CallAndResponseType {
  return {
    call: ['/g_queryTree', groupID, dumpControlValues],
    response: ['/g_queryTree.reply', groupID]
  };
}

/***** Unit Generator Commands ***  */

/**
  * Send a command to a unit generator.

   Sends all arguments following the command name to the unit generator to be performed. Commands are defined by unit generator plug ins.

  * @param {int} nodeID -
  * @param {int} uGenIndex - unit generator index
  * @param {String} command -
  * @param {Array} args
  * @return {Array} - OSC message
  */
export function ugenCmd(
  nodeID: number,
  uGenIndex: number,
  command: string,
  args: MsgType = []
): MsgType {
  return ['/u_cmd', nodeID, uGenIndex, command].concat(args);
}

/***** Buffer Commands ***  */

// Buffers are stored in a global array, indexed by integers starting at zero.

/**
  * Allocates zero filled buffer to number of channels and samples.

  * Asynchronous. Replies with `/done /b_alloc bufNum`.

  * @param {int} bufferID
  * @param {int} numFrames
  * @param {int} numChannels
  * @param {Array} completionMsg - (optional)
  * @return {Array} - OSC message
  */
export function bufferAlloc(
  bufferID: number,
  numFrames: number,
  numChannels: number,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: ['/b_alloc', bufferID, numFrames, numChannels, completionMsg],
    response: ['/done', '/b_alloc', bufferID]
  };
}

/**
  * Allocate buffer space and read a sound file.

  Allocates buffer to number of channels of file and number of samples requested, or fewer if sound file is smaller than requested. Reads sound file data from the given starting frame in the file. If the number of frames argument is less than or equal to zero, the entire file is read.
  * Asynchronous. Replies with `/done /b_allocRead bufNum`.

  * @param {int} bufferID
  * @param {String} path - name of a sound file.
  * @param {int} startFrame - starting frame in file (optional. default = 0)
  * @param {int} numFramesToRead - number of frames to read (optional. default = 0, see below)
  * @param {Array} completionMsg - (optional)
  * @return {Array} - OSC message
  */
export function bufferAllocRead(
  bufferID: number,
  path: string,
  startFrame: number = 0,
  numFramesToRead: number = -1,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: [
      '/b_allocRead',
      bufferID,
      path,
      startFrame,
      numFramesToRead,
      completionMsg
    ],
    response: ['/done', '/b_allocRead', bufferID]
  };
}

/**
  * Allocate buffer space and read channels from a sound file.

  As `b_allocRead`, but reads individual channels into the allocated buffer in the order specified.
  * Asynchronous. Replies with `/done /b_allocReadChannel bufNum`.

  * @param {int} bufferID - buffer number
  * @param {String} path - path name of a sound file
  * @param {int} startFrame - starting frame in file
  * @param {int} numFramesToRead - number of frames to read
  * @param {Array.<int>} channels - source file channel indices
  * @param {Array} completionMsg - (optional)
  * @return {Array} - OSC message
  */
export function bufferAllocReadChannel(
  bufferID: number,
  path: string,
  startFrame: number,
  numFramesToRead: number,
  channels: [number],
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: ['/b_allocReadChannel', bufferID, path, startFrame, numFramesToRead]
      .concat(channels)
      .concat([completionMsg]),
    response: ['/done', '/b_allocReadChannel', bufferID]
  };
}

/**
  * Read sound file data into an existing buffer.

    Reads sound file data from the given starting frame in the file and writes it to the given starting frame in the buffer. If number of frames is less than zero, the entire file is read.

    If reading a file to be used by `DiskIn` ugen then you will want to set "leave file open" to one, otherwise set it to zero.

  * Asynchronous. Replies with `/done /b_read bufNum`.
  *
  * @param {int} bufferID
  * @param {String} path - path name of a sound file.
  * @param {int} startFrame - starting frame in file (optional. default = 0)
  * @param {int} numFramesToRead - number of frames to read (optional. default = -1, see below)
  * @param {int} startFrameInBuffer - starting frame in buffer (optional. default = 0)
  * @param {int} leaveFileOpen - leave file open (optional. default = 0)
  * @param {Array} completionMsg - (optional)
  * @return {Array} - OSC message
  */
export function bufferRead(
  bufferID: number,
  path: string,
  startFrame: number = 0,
  numFramesToRead: number = -1,
  startFrameInBuffer: number = 0,
  leaveFileOpen: number = 0,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: [
      '/b_read',
      bufferID,
      path,
      startFrame,
      numFramesToRead,
      startFrameInBuffer,
      leaveFileOpen,
      completionMsg
    ],
    response: ['/done', '/b_read', bufferID]
  };
}

/**
  * Read sound file channel data into an existing buffer.

  * As `b_read`, but reads individual channels in the order specified. The number of channels requested must match the number of channels in the buffer.

  * Asynchronous. Replies with `/done /b_readChannel bufNum`.

  * @param {int} bufferID
  * @param {String} path - of a sound file
  * @param {int} startFrame - starting frame in file
  * @param {int} numFramesToRead - number of frames to read
  * @param {int} startFrameInBuffer - starting frame in buffer
  * @param {int} leaveFileOpen - leave file open
  * @param {Array.<int>} channels - source file channel indexes
  * @param {Array} completionMsg
  * @return {Array} - OSC message
  */
export function bufferReadChannel(
  bufferID: number,
  path: string,
  startFrame: number = 0,
  numFramesToRead: number = -1,
  startFrameInBuffer: number = 0,
  leaveFileOpen: number = 0,
  channels: Array<number> = [],
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: [
      '/b_readChannel',
      bufferID,
      path,
      startFrame,
      numFramesToRead,
      startFrameInBuffer,
      leaveFileOpen
    ]
      .concat(channels)
      .concat([completionMsg]),
    response: ['/done', '/b_readChannel', bufferID]
  };
}

/**
  * Write buffer contents to a sound file.

  * Not all combinations of header format and sample format are possible.

  If number of frames is less than zero, all samples from the starting frame to the end of the buffer are written.
  If opening a file to be used by DiskOut ugen then you will want to set "leave file open" to one, otherwise set it to zero. If "leave file open" is set to one then the file is created, but no frames are written until the DiskOut ugen does so.

  * Asynchronous. Replies with `/done /b_write bufNum`.

  * @param {int} bufferID
  * @param {String} path - path name of a sound file.
  * @param {String} headerFormat -
  * Header format is one of: "aiff", "next", "wav", "ircam"", "raw"
  * @param {String} sampleFormat -
  * Sample format is one of: "int8", "int16", "int24", "int32", "float", "double", "mulaw", "alaw"
  * @param {int} numFramesToWrite - number of frames to write (optional. default = -1, see below)
  * @param {int} startFrameInBuffer - starting frame in buffer (optional. default = 0)
  * @param {int} leaveFileOpen - leave file open (optional. default = 0)
  * @param {Array} completionMsg - (optional)
  * @return {Array} - OSC message
  */
export function bufferWrite(
  bufferID: number,
  path: string,
  headerFormat: string = 'aiff',
  sampleFormat: string = 'float',
  numFramesToWrite: number = -1,
  startFrameInBuffer: number = 0,
  leaveFileOpen: number = 0,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: [
      '/b_write',
      bufferID,
      path,
      headerFormat,
      sampleFormat,
      numFramesToWrite,
      startFrameInBuffer,
      leaveFileOpen,
      completionMsg
    ],
    response: ['/done', '/b_write', bufferID]
  };
}

/**
  * Frees buffer space allocated for this buffer.
  *
  * Asynchronous. Replies with `/done /b_free bufNum`.
  *
  * @param {int} bufferID
  * @param {Array} completionMsg - (optional)
  * @return {Array} - OSC message
  */
export function bufferFree(
  bufferID: number,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: ['/b_free', bufferID, completionMsg],
    response: ['/done', '/b_free', bufferID]
  };
}

/**
  * Sets all samples in the buffer to zero.
  *
  * Asynchronous. Replies with `/done /b_zero bufNum`.

  * @param {int} bufferID
  * @param {Array} completionMsg - (optional)
  * @return {Array} - OSC message
  */
export function bufferZero(
  bufferID: number,
  completionMsg: ?MsgType = null
): CallAndResponseType {
  return {
    call: ['/b_zero', bufferID, completionMsg],
    response: ['/done', '/b_zero', bufferID]
  };
}

/**
  * Takes a list of pairs of sample indices and values and sets the samples to those values.

  * @param {int} bufferID
  * @param {Array} pairs - `[[frame, value], ...]`
  * @return {Array} - OSC message
  */
export function bufferSet(bufferID: number, pairs: PairsType): MsgType {
  return ['/b_set', bufferID].concat(_.flatten(pairs));
}

/**
  * Set ranges of sample value(s).

  * Set contiguous ranges of sample indices to sets of values. For each range, the starting sample index is given followed by the number of samples to change, followed by the values.

  * @param {int} bufferID
  * @param {int} startFrame
  * @param {Array.<float>} values
  * @return {Array} - OSC message
  */
export function bufferSetn(
  bufferID: number,
  startFrame: number,
  values: Array<number> = []
): MsgType {
  return ['/b_setn', bufferID, startFrame, values.length].concat(values);
}

/**
  * Fill ranges of samples with a value

  * Set contiguous ranges of sample indices to single values. For each range, the starting sample index is given followed by the number of samples to change, followed by the value to fill. This is only meant for setting a few samples, not whole buffers or large sections.

  * @param {int} bufferID
  * @param {int} startFrame
  * @param {int} numFrames
  * @param {float} value
  * @return {Array} - OSC message
  */
export function bufferFill(
  bufferID: number,
  startFrame: number,
  numFrames: number,
  value: number
): MsgType {
  return ['/b_fill', bufferID, startFrame, numFrames, value];
}

/**
  * Call a command to fill a buffer.

  * Plug-ins can define commands that operate on buffers. The arguments after the command name are defined by the command. The currently defined buffer fill commands are listed below in a separate section.

  * Asynchronous. Replies with `/done /b_gen bufNum`.

  * @param {int} bufferID
  * @param {String} command
  * @param {Array} args
  * @return {Array} - OSC message
  */
export function bufferGen(
  bufferID: number,
  command: string,
  args: MsgType = []
): CallAndResponseType {
  return {
    call: ['/b_gen', bufferID, command].concat(args),
    response: ['/done', '/b_gen', bufferID]
  };
}

/**
  * After using a buffer with `DiskOut`, close the soundfile and write header information.

  * Asynchronous. Replies with `/done /b_close bufNum`.

  * @param {int} bufferID
  * @return {Array} - OSC message
  */
export function bufferClose(bufferID: number): CallAndResponseType {
  return {
    call: ['/b_close', bufferID],
    response: ['/done', '/b_close', bufferID]
  };
}

/**
  * Get buffer info.

  * Responds to the sender with a `/b_info` message with:
  * multiple:
      * param {int} bufferID
      * param {int} - number of frames
      * param {int} - number of channels
      * param {float} sample rate

  * @param {int} bufferID
  * @return {Array} - OSC message
  */
export function bufferQuery(bufferID: number): CallAndResponseType {
  return {
    call: ['/b_query', bufferID],
    response: ['/b_info', bufferID] // => [numFrames, numChannels, sampleRate]
  };
}

/**
  * Get sample value(s).
  * Replies with the corresponding `/b_set` command.
  *
  * @param {int} bufferID - buffer number
  * @param {Array} framesArray - sample indices to return
  */
export function bufferGet(
  bufferID: number,
  framesArray: [number]
): CallAndResponseType {
  return {
    call: ['/b_get', bufferID].concat(framesArray),
    response: ['/b_set', bufferID] // => sampleValues
  };
}

/**
    Get ranges of sample value(s).

    Get contiguous ranges of samples. Replies with the corresponding `b_setn` command. This is only meant for getting a few samples, not whole buffers or large sections.

  * @param {int} bufferID
  * @param {int} startFrame - starting sample index
  * @param {int} numFrames - number of sequential samples to get (M)
  * @return {Array} - OSC message
  */
export function bufferGetn(
  bufferID: number,
  startFrame: number,
  numFrames: number
): CallAndResponseType {
  return {
    call: ['/b_getn', bufferID, startFrame, numFrames],
    response: ['/b_setn', bufferID] // => sampleValues
  };
}

/***** Control Bus Commands ***  */

/**
  * Takes a list of pairs of bus indices and values and sets the buses to those values.
  *
  * @param {Array} pairs - `[[busID, value], ...]`
  * @return {Array} - OSC message
  */
export function controlBusSet(pairs: PairsType): MsgType {
  return ['/c_set'].concat(_.flatten(pairs));
}

/**
  * Set ranges of bus value(s).

  * Set contiguous ranges of buses to sets of values. For each range, the starting bus index is given followed by the number of channels to change, followed by the values.
  *
  * @param {Array} triples - `[[firstBusID, numBussesToChange, value], ...]`
  * @return {Array} - OSC message
  */
export function controlBusSetn(triples: PairsType = []): MsgType {
  return ['/c_setn'].concat(_.flatten(triples));
}

/**
  * Fill ranges of bus value(s).
  *
  * Set contiguous ranges of buses to single values. For each range, the starting sample index is given followed by the number of buses to change, followed by the value to fill.
  *
  * TODO: What is difference to `c_setn` ?
  *
  * @param {Array} triples - `[[firstBusID, numBussesToChange, value], ...]`
  * @return {Array} - OSC message
  */
export function controlBusFill(triples: PairsType = []): MsgType {
  return ['/c_fill'].concat(_.flatten(triples));
}

/**
  * Get control bus values
  *
  * Takes a bus ID and replies with the corresponding `c_set` command.
  *
  * @param {Number} busID
  */
export function controlBusGet(busID: number): CallAndResponseType {
  return {
    call: ['/c_get', busID],
    response: ['/c_set', busID] // => busValue
  };
}

/**
  * Get contiguous ranges of buses. Replies with the corresponding `c_setn` command.
  *
  * @param {int} startBusIndex - starting bus index
  * @param {int} numBusses - number of sequential buses to get (M)
  */
export function controlBusGetn(
  startBusIndex: number,
  numBusses: number
): CallAndResponseType {
  return {
    call: ['/c_getn', startBusIndex, numBusses],
    response: ['/c_setn', startBusIndex] // => busValues
  };
}

/***** Non Real Time Mode Commands ***  */

/**
  End real time mode, close file.  Not yet implemented on server

  This message should be sent in a bundle in non real time mode.
  The bundle timestamp will establish the ending time of the file.
  This command will end non real time mode and close the sound file.
  Replies with `/done`.

  */
export function nonRealTimeEnd(): CallAndResponseType {
  return {
    call: ['/nrt_end'],
    response: ['/done']
  };
}
