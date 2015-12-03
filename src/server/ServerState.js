/**
 *
 */

import Immutable from 'immutable';
import Store from '../dryadic/Store';
import * as alloc from './internals/allocators';
import {watchNodeNotifications} from './node-watcher';


const keys = {
  SERVERS: 'SERVERS',
  NODE_IDS: 'nodeAllocator',
  CONTROL_BUSSES: 'controlBusAllocator',
  AUDIO_BUSSES: 'audioBusAllocator',
  BUFFERS: 'bufferAllocator'
};

/**
 * Holds state for a Server such as node/bus/buffer allocators, node status and SynthDefs compiled.
 *
 * Each server is stored by its unique address, so multiple Servers can store state in the same global Store object.
 */
export default class ServerState {

  /**
   * @param {Server} server
   * @param {Store} store - optional parent Store to use.
   */
  constructor(server, store) {
    this.server = server;
    this.store = store ? store : new Store();
    this.resetState();
    watchNodeNotifications(this.server);
  }

  resetState() {
    this.store.mutateState(this._keys([]), () => {
      const options = this.server.options;
      var numAudioChannels = options.numPrivateAudioBusChannels +
        options.numInputBusChannels +
        options.numOutputBusChannels;

      var ab = alloc.initialBlockState(numAudioChannels);
      ab = alloc.reserveBlock(ab, 0, options.numInputBusChannels + options.numOutputBusChannels);
      var cb = alloc.initialBlockState(options.numControlBusChannels);
      var bb = alloc.initialBlockState(options.numBuffers);

      return Immutable.Map({
        [keys.NODE_IDS]: options.initialNodeID - 1,
        [keys.AUDIO_BUSSES]: ab,
        [keys.CONTROL_BUSSES]: cb,
        [keys.BUFFERS]: bb
      });
    });
  }

  /**
   * Mutate a value or object in the server state.
   *
   * @param {String} key - top level key eg. nodeAllocator, controlBufAllocator
   * @param {Function} fn - will receive current state or an empty Map, returns the altered state.
   */
  mutate(key, fn) {
    this.store.mutateState(this._keys([key]), fn);
  }

  /**
   * Get current state value for the server using an array of keys.
   *
   * @param {String} keys - list of keys eg. ['NODE_WATCHER', 'n_go', 1000]
   * @param {any} notSetValue - default value to return if empty
   * @returns {any}
   */
  getIn(keys, notSetValue) {
    return this.store.getIn(this._keys(keys), notSetValue);
  }

  /**
   * Allocates a node ID to be used for making a synth or group
   *
   * @returns {int}
   */
  nextNodeID() {
    return this.store.mutateStateAndReturn(this._keys([keys.NODE_IDS]), alloc.increment);
  }

  /**
   * Allocate an audio bus.
   *
   * @returns {int} numChannels
   */
  allocAudioBus(numChannels=1) {
    return this._allocBlock(keys.AUDIO_BUSSES, numChannels);
  }

  /**
   * Allocate a control bus.
   *
   * @returns {int} numChannels
   */
  allocControlBus(numChannels=1) {
    return this._allocBlock(keys.CONTROL_BUSSES, numChannels);
  }

  /**
   * Free a previously allocate audio bus
   *
   * These require you to remember the channels and it messes it up
   * if you free it wrong. will change to higher level storage.
   *
   * @param {int} index
   * @param {int} numChannels
   */
  freeAudioBus(index, numChannels) {
    this._freeBlock(keys.AUDIO_BUSSES, index, numChannels);
  }

  /**
   * Free a previously allocated control bus
   *
   * These require you to remember the channels and it messes it up
   * if you free it wrong. will change to higher level storage.
   *
   * @param {int} index
   * @param {int} numChannels
   */
  freeControlBus(index, numChannels) {
    this._freeBlock(keys.CONTROL_BUSSES, index, numChannels);
  }

  /**
   * Allocate a buffer id.
   *
   * Note that numChannels is specified when creating the buffer.
   * This allocator makes sure that the neighboring buffers are empty.
   *
   * @param {int} numConsecutive - consecutively numbered buffers are needed by VOsc and VOsc3.
   * @returns {int} - buffer id
   */
  allocBufferID(numConsecutive=1) {
    return this._allocBlock(keys.BUFFERS, numConsecutive);
  }

  /**
   * Free a previously allocated buffer id.
   *
   * Note that numChannels is specified when creating the buffer.
   *
   * @param {int} index
   * @param {int} numConsecutive - consecutively numbered buffers are needed by VOsc and VOsc3.
   */
  freeBuffer(index, numConsecutive) {
    this._freeBlock(keys.BUFFERS, index, numConsecutive);
  }

  _allocBlock(key, numChannels) {
    return this.store.mutateStateAndReturn(this._keys([key]),
      (state) => alloc.allocBlock(state, numChannels));
  }
  _freeBlock(key, index, numChannels) {
    this.mutate(key, (state) => alloc.freeBlock(state, index, numChannels));
  }
  _keys(more=[]) {
    return [keys.SERVERS, this.server.address].concat(more);
  }
}
