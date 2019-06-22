/**
 * @flow
 */

import * as Immutable from 'immutable';
import Store from './internals/Store';
import * as alloc from './internals/allocators';
import { watchNodeNotifications } from './node-watcher';
import type Server from './server';

const StateKeys = {
  SERVERS: 'SERVERS',
  NODE_IDS: 'nodeAllocator',
  CONTROL_BUSSES: 'controlBusAllocator',
  AUDIO_BUSSES: 'audioBusAllocator',
  BUFFERS: 'bufferAllocator'
};

/**
 * Holds state for a Server such as node/bus/buffer allocators,
 * node status and SynthDefs compiled.
 *
 * Server has this has as the property: server.state
 *
 * Many of these functions are low-level accessors and allocators
 * useful for building higher-level applications that are easier
 * to use.
 *
 * Each server is stored by its unique address,
 * so multiple Servers can store state in the same
 * global Store object.
 */
export default class ServerState {
  server: Server;
  store: Store;

  /**
   * @param {Server} server
   * @param {Store} store - optional parent Store to use.
   */
  constructor(server: Server, store: Store) {
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
      ab = alloc.reserveBlock(
        ab,
        0,
        options.numInputBusChannels + options.numOutputBusChannels
      );
      var cb = alloc.initialBlockState(options.numControlBusChannels);
      var bb = alloc.initialBlockState(options.numBuffers);

      return Immutable.Map({
        [StateKeys.NODE_IDS]: options.initialNodeID - 1,
        [StateKeys.AUDIO_BUSSES]: ab,
        [StateKeys.CONTROL_BUSSES]: cb,
        [StateKeys.BUFFERS]: bb
      });
    });
  }

  /**
   * Mutate a value or object in the server state.
   *
   * @param {String} key - top level key eg. nodeAllocator, controlBufAllocator
   * @param {Function} fn - will receive current state or an empty Map, returns the altered state.
   */
  mutate(key: string, fn: Function) {
    this.store.mutateState(this._keys([key]), fn);
  }

  /**
   * Get current state value for the server using an array of keys.
   *
   * @param {String} keys - list of keys eg. `['NODE_WATCHER', 'n_go', 1000]`
   * @param {any} notSetValue - default value to return if empty
   * @returns {any}
   */
  getIn(keys: [string], notSetValue: any): any {
    return this.store.getIn(this._keys(keys), notSetValue);
  }

  /**
   * Allocates a node ID to be used for making a synth or group
   *
   * @returns {int}
   */
  nextNodeID(): number {
    return this.store.mutateStateAndReturn(
      this._keys([StateKeys.NODE_IDS]),
      alloc.increment
    );
  }

  /**
   * Allocate an audio bus.
   *
   * @returns {int} bus number
   */
  allocAudioBus(numChannels: number = 1): number {
    return this._allocBlock(StateKeys.AUDIO_BUSSES, numChannels);
  }

  /**
   * Allocate a control bus.
   *
   * @returns {int} bus number
   */
  allocControlBus(numChannels: number = 1): number {
    return this._allocBlock(StateKeys.CONTROL_BUSSES, numChannels);
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
  freeAudioBus(index: number, numChannels: number) {
    this._freeBlock(StateKeys.AUDIO_BUSSES, index, numChannels);
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
  freeControlBus(index: number, numChannels: number) {
    this._freeBlock(StateKeys.CONTROL_BUSSES, index, numChannels);
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
  allocBufferID(numConsecutive: number = 1): number {
    return this._allocBlock(StateKeys.BUFFERS, numConsecutive);
  }

  /**
   * Free a previously allocated buffer id.
   *
   * Note that numChannels is specified when creating the buffer.
   *
   * @param {int} index
   * @param {int} numConsecutive - consecutively numbered buffers are needed by VOsc and VOsc3.
   */
  freeBuffer(index: number, numConsecutive: number) {
    this._freeBlock(StateKeys.BUFFERS, index, numConsecutive);
  }

  _allocBlock(key: string, numChannels: number): number {
    return this.store.mutateStateAndReturn(this._keys([key]), state =>
      alloc.allocBlock(state, numChannels));
  }

  _freeBlock(key: string, index: number, numChannels: number) {
    this.mutate(key, state => alloc.freeBlock(state, index, numChannels));
  }

  _keys(more: Array<string> = []): [string] {
    return [StateKeys.SERVERS, this.server.address].concat(more);
  }
}
