/**
 *
 * scsynth - boots a supercollider synthesis server process
 *
 *  SuperCollider comes with an executable called scsynth
 *  which can be communicated with via udp OSC
 *
 *  The primary way to send messages in with sendMsg
 *  eg. server.sendMsg('/s_new', ['defName', 440])

 *  and the responses are emitted as 'OSC'
 *  eg. server.on('OSC', function(msg) {  ...  });
 *
 * methods:
 *   boot        - boot an scsynth process
 *   quit
 *   connect     - connect via udp OSC
 *   disconnect
 *   sendMsg     - send an OSC message
 *
 * emits:
 *    'out'   - stdout text from the server
 *    'error' - stderr text from the server or OSC error messages
 *    'exit'  - when server exits
 *    'close' - when server closes the UDP connection
 *    'OSC'   - OSC responses from the server
 */

import Immutable from 'immutable';
import * as alloc from './allocators';

var
  _ = require('underscore'),
  EventEmitter = require('events').EventEmitter,
  spawn = require('child_process').spawn,
  defaultOptions = require('./default-server-options.json'),
  Logger = require('./logger'),
  dgram = require('dgram'),
  osc = require('osc-min'),
  Q = require('q');


const keys = {
  NODE_IDS: 'nodeAllocator',
  CONTROL_BUSSES: 'controlBusAllocator',
  AUDIO_BUSSES: 'audioBusAllocator',
  BUFFERS: 'bufferAllocator'
};


export class Server extends EventEmitter {

  /**
   * @param {Object} options - server command line options
   */
  constructor(options={}) {
    super();
    this.options = _.defaults(options, defaultOptions);
    this.process = null;
    this.isRunning = false;
    this.log = new Logger(this.options.debug, this.options.echo);
    this.resetState();
  }

  resetState() {
    var state = Immutable.Map();
    state = state.set(keys.NODE_IDS, this.options.initialNodeID - 1);

    var numAudioChannels = this.options.numPrivateAudioBusChannels +
      this.options.numInputBusChannels +
      this.options.numOutputBusChannels;
    var ab = alloc.initialBlockState(numAudioChannels);
    ab = alloc.reserveBlock(ab, 0, this.options.numInputBusChannels + this.options.numOutputBusChannels);
    state = state.set(keys.AUDIO_BUSSES, ab);

    var cb = alloc.initialBlockState(this.options.numControlBusChannels);
    state = state.set(keys.CONTROL_BUSSES, cb);

    var bb = alloc.initialBlockState(this.options.numBuffers);
    state = state.set(keys.BUFFERS, cb);

    this.state = state;
  }

  /**
   * Format command line args for scsynth
   *
   * not yet fully implemented
   *
   * @return {array} list of non-default args
   */
  args() {
    var o = [];
    o.push(this.options.protocol === 'udp' ? '-u' : '-t');
    o.push(this.options.serverPort);
    return o;
  }

  /**
   * boot
   *
   * start scsynth and establish a pipe connection
   * to receive stdout and stderr
   *
   * listen for system events and emit: exit out error
   */
  boot() {
    var
      self = this,
      execPath = this.options.scsynth,
      args = this.args(),
      d = Q.defer();

    this.log.dbug(execPath + ' ' + args.join(' '));
    this.process = spawn(execPath, args,
      {
        cwd: this.options.cwd
      });
    this.log.dbug('Spawned pid: ' + this.process.pid);

    this.process.on('error', (err) => {
      this.log.err('Server error ' + err);
      this.emit('exit', err);
      // this.isRunning = false;
    });
    this.process.on('close', (code, signal) => {
      this.log.dbug('Server closed ' + code);
      this.emit('exit', code);
      this.isRunning = false;
    });
    this.process.on('exit', (code, signal) => {
      this.log.dbug('Server exited ' + code);
      this.emit('exit', code);
      this.isRunning = false;
    });

    this.process.stdout.on('data', (data) => {
      this.log.stdout('' + data);
      this.emit('out', data);
      this.isRunning = true;
    });
    this.process.stderr.on('data', (data) => {
      this.log.stderr('' + data);
      this.emit('stderr', data);
      this.isRunning = true;
    });

    setTimeout(() => {
      if (this.isRunning) {
        d.resolve();
      } else {
        d.reject();
      }
    }, 100);

    return d.promise;
  }

  /**
   * quit
   *
   * kill scsynth process
   */
  quit() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  connect() {
    var self = this;
    this.udp = dgram.createSocket('udp4');

    this.udp.on('message', function(msgbuf, rinfo) {
      var msg = osc.fromBuffer(msgbuf);
      self.log.rcvosc(msg);
      self.emit('OSC', msg);
    });

    this.udp.on('error', function(e) {
      self.log.err(e);
      self.emit('error', e);
    });
    this.udp.on('listening', function() {
      self.log.dbug('udp is listening');
    });
    this.udp.on('close', function(e) {
      self.log.dbug('udp close' + e);
      self.emit('close', e);
    });
  }

  disconnect() {
    if (this.udp) {
      this.udp.close();
      delete this.udp;
    }
  }

  /**
   * @param {String} address - OSC command, referred to as address
   * @param {Array} args
   */
  sendMsg(address, args) {
    var buf = osc.toBuffer({
      address: address,
      args: args
    });
    this.log.sendosc(address + ' ' + args.join(' '));
    this.udp.send(buf, 0, buf.length, this.options.serverPort, this.options.host);
  }

  nextNodeID() {
    return this._mutateState(keys.NODE_IDS, alloc.increment);
  }

  // temporary raw allocator calls
  allocAudioBus(numChannels=1) {
    return this._allocBlock(keys.AUDIO_BUSSES, numChannels);
  }
  allocControlBus(numChannels=1) {
    return this._allocBlock(keys.CONTROL_BUSSES, numChannels);
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

  // these require you to remember the channels and mess it up
  // if you free it wrong
  freeAudioBus(index, numChannels) {
    return this._freeBlock(keys.AUDIO_BUSSES, index, numChannels);
  }
  freeControlBus(index, numChannels) {
    return this._freeBlock(keys.CONTROL_BUSSES, index, numChannels);
  }
  freeBuffer(index, numChannels) {
    return this._freeBlock(keys.BUFFERS, index, numChannels);
  }

  // private
  /**
   * Fetch one part of the state,
   * mutate it with the callback,
   * save state and return the result.
   *
   * @returns {any} result
   */
  _mutateState(key, fn) {
    var result, state;
    [result, state] = fn(this.state.get(key));
    this.state = this.state.set(key, state);
    return result;
  }
  _mutateStateNoReturn(key, fn) {
    var state = fn(this.state.get(key));
    this.state = this.state.set(key, state);
  }
  _allocBlock(key, numChannels) {
    return this._mutateState(key,
      (state) => alloc.allocBlock(state, numChannels));
  }
  _freeBlock(key, index, numChannels) {
    return this._mutateStateNoReturn(key,
      (state) => alloc.freeBlock(state, index, numChannels));
  }
}

/**
 * boot a server with options
 * @returns {Promise}
 */
export function boot(options) {
  var resolveOptions = require('./resolveOptions');
  return resolveOptions(null, options).then(function(opts) {
    var s = new Server(opts);
    return s.boot().then(function() {
      s.connect();
      return s;
    });
  });
}
