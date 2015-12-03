/**
 *
 */

import Immutable from 'immutable';
import Store from '../utils/Store';
import * as alloc from './internals/allocators';
import {watchNodeNotifications} from './node-watcher';


const keys = {
  SERVERS: 'SERVERS',
  NODE_IDS: 'nodeAllocator',
  CONTROL_BUSSES: 'controlBusAllocator',
  AUDIO_BUSSES: 'audioBusAllocator',
  BUFFERS: 'bufferAllocator'
};


export default class ServerState {

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

  mutate(key, fn) {
    this.store.mutateState(this._keys([key]), fn);
  }

  getIn(keys, notSetValue) {
    return this.store.getIn(this._keys(keys), notSetValue);
  }

  /**
   * @returns {int}
   */
  nextNodeID() {
    return this.store.mutateStateAndReturn(this._keys([keys.NODE_IDS]), alloc.increment);
  }

  // temporary raw allocator calls
  allocAudioBus(numChannels=1) {
    return this._allocBlock(keys.AUDIO_BUSSES, numChannels);
  }
  allocControlBus(numChannels=1) {
    return this._allocBlock(keys.CONTROL_BUSSES, numChannels);
  }
  // These require you to remember the channels and it messes it up
  // if you free it wrong. will change to higher level storage.
  freeAudioBus(index, numChannels) {
    return this._freeBlock(keys.AUDIO_BUSSES, index, numChannels);
  }
  freeControlBus(index, numChannels) {
    return this._freeBlock(keys.CONTROL_BUSSES, index, numChannels);
  }

  /**
   * Allocate a buffer id.
   *
   * Note that numChannels is specified when creating the buffer.
   *
   * @param {int} numConsecutive - consecutively numbered buffers are needed by VOsc and VOsc3.
   * @returns {int}
   */
  allocBufferID(numConsecutive=1) {
    return this._allocBlock(keys.BUFFERS, numConsecutive);
  }

  freeBuffer(index, numChannels) {
    return this._freeBlock(keys.BUFFERS, index, numChannels);
  }

  _allocBlock(key, numChannels) {
    return this.store.mutateStateAndReturn(this._keys([key]),
      (state) => alloc.allocBlock(state, numChannels));
  }
  _freeBlock(key, index, numChannels) {
    return this.mutate(key, (state) => alloc.freeBlock(state, index, numChannels));
  }
  _keys(more=[]) {
    return [keys.SERVERS, this.server.address].concat(more);
  }
}
