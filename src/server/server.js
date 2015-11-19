/**
 *
 * Server - boots the SuperCollider synthesis server
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

import {EventEmitter} from 'events';
import {Observable, Subject} from 'Rx';
import {spawn} from 'child_process';
import * as _ from 'underscore';
import * as dgram from 'dgram';
import * as osc from 'osc-min';
import Immutable from 'immutable';
import {Promise} from 'bluebird';

import * as alloc from './internals/allocators';
import SendOSC from './internals/send-osc';
import {parseMessage} from './osc/utils';
import {notify} from './osc/msg';
import {watchNodeNotifications} from './node-watcher';
import defaultOptions from './default-server-options';
import Logger from '../utils/Logger';
import resolveOptions from '../utils/resolveOptions';


const keys = {
  NODE_IDS: 'nodeAllocator',
  CONTROL_BUSSES: 'controlBusAllocator',
  AUDIO_BUSSES: 'audioBusAllocator',
  BUFFERS: 'bufferAllocator'
};


function _noop() {}


export class Server extends EventEmitter {

  /**
   * @param {Object} options - command line options for scsynth
   */
  constructor(options={}) {
    super();
    this.options = _.defaults(options, defaultOptions);
    this.process = null;
    this.isRunning = false;

    // subscribeable streams
    this.send = new SendOSC();
    this.receive = new Subject();
    this.stdout = new Subject();
    this.processEvents = new Subject();

    this._initLogger();
    this._initEmitter();
    this._initSender();
    watchNodeNotifications(this);

    this._serverObservers = {};
    this.resetState();
  }

  _initLogger() {
    this.log = new Logger(this.options.debug, this.options.echo);
    this.send.subscribe((event) => {
      // will be a type:msg or type:bundle
      var out;
      if (event.type === 'msg') {
        out = event.payload.join(' ');
      } else {
        out = String(event.payload);
      }
      if (!this.osc) {
        out = '[NOT CONNECTED] ' + out;
      }
      this.log.sendosc(out);
    });
    this.receive.subscribe((o) => this.log.rcvosc(o), (err) => this.log.err(err));
    this.stdout.subscribe((o) => this.log.stdout(o), (o) => this.log.stderr(o));
    this.processEvents.subscribe((o) => this.log.dbug(o), (o) => this.log.err(o));
  }
  _initEmitter() {
    // emit signals are deprecated.
    // use server.{channel}.subscribe((event) => { })
    this.receive.subscribe((msg) => {
      this.emit('OSC', msg);
    });
    this.processEvents.subscribe(_noop, (err) => this.emit('exit', err));
    this.stdout.subscribe((out) => this.emit('out', out), (out) => this.emit('stderr', out));
  }
  _initSender() {
    this.send.on('msg', (msg) => {
      if (this.osc) {
        var buf = osc.toBuffer({
          address: msg[0],
          args: msg.slice(1)
        });
        this.osc.send(buf, 0, buf.length, this.options.serverPort, this.options.host);
      }
    });
  }

  resetState() {
    // mutate
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
    // o.push(this.options.protocol === 'udp' ? '-u' : '-t');
    o.push('-u');  // only udp socket is implemented right now
    o.push(this.options.serverPort);
    return o;
  }

  /**
   * Boot the server
   *
   * Start scsynth and establish a pipe connection to receive stdout and stderr.
   *
   * Does not connect, so UDP is not yet ready for OSC communication.
   *
   * listen for system events and emit: exit out error
   */
  boot() {
    return new Promise((resolve, reject) => {
      var
        self = this,
        execPath = this.options.scsynth,
        args = this.args();

      this.isRunning = false;

      this.processEvents.onNext('Start process: ' + execPath + ' ' + args.join(' '));
      this.process = spawn(execPath, args, {
        cwd: this.options.cwd
      });
      this.processEvents.onNext('pid: ' + this.process.pid);

      // when this parent process dies, kill child process
      process.on('exit', (code) => {
        if (this.process) {
          this.process.kill('SIGTERM');
        }
      });

      this.process.on('error', (err) => {
        this.processEvents.onError(err);
        this.isRunning = false;
        // this.disconnect()
      });
      this.process.on('close', (code, signal) => {
        this.processEvents.onError('Server closed. Exit code: ' + code + ' signal: ' + signal);
        this.isRunning = false;
        // this.disconnect()
      });
      this.process.on('exit', (code, signal) => {
        this.processEvents.onError('Server exited. Exit code: ' + code + ' signal: ' + signal);
        this.isRunning = false;
        // this.disconnect()
      });

      this._serverObservers.stdout = Observable.fromEvent(this.process.stdout, 'data', (data) => String(data));
      this._serverObservers.stdout.subscribe((e) => this.stdout.onNext(e));
      this._serverObservers.stderr = Observable.fromEvent(this.process.stderr, 'data')
        .subscribe((out) => {
          // just pipe it into the stdout object's error stream
          this.stdout.onError(out);
        });

      // watch for ready message
      this._serverObservers.stdout.takeWhile((text) => {
        return !(text.match(/SuperCollider 3 server ready/));
      })
        .subscribe((next) => {},
          this.log.err,
          () => { // onComplete
            this.isRunning = true;
            resolve(this);
          });

      setTimeout(() => {
        if (!this.isRunning) {
          reject();
        }
      }, 3000);
    });
  }

  /**
   * quit
   *
   * kill scsynth process
   * TODO: should send /quit first for shutting files
   */
  quit() {
    if (this.process) {
      this.disconnect();
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  /**
   * Establish connection to scsynth via OSC socket
   *
   * @returns {Promise} - resolves when udp responds
   */
  connect() {
    return new Promise((resolve, reject) => {
      const udpListening = 'udp is listening';

      this.osc = dgram.createSocket('udp4');

      this.osc.on('listening', () => {
        this.processEvents.onNext(udpListening);
      });
      this.osc.on('close', (e) => {
        this.processEvents.onNext('udp closed: ' + e);
        this.disconnect();
      });

      // pipe events to this.receive
      this._serverObservers.oscMessage = Observable.fromEvent(this.osc, 'message', (msgbuf) => osc.fromBuffer(msgbuf));
      this._serverObservers.oscMessage.subscribe((e) => this.receive.onNext(parseMessage(e)));

      this._serverObservers.oscError = Observable.fromEvent(this.osc, 'error');
      this._serverObservers.oscError.subscribe((e) => {
        this.receive.onError(e);
        reject(e);
      });

      // this will trigger a response from server
      // which will cause a udp listening event.
      // After server responds then we are truly connected.
      this.callAndResponse(notify()).then(() => {
        resolve();
      });
    });
  }

  disconnect() {
    if (this.osc) {
      this.osc.close();
      delete this.osc;
    }
    this._serverObservers.forEach((obs, k) => {
      obs.dispose();
    });
    this._serverObservers = {};
  }

  /**
   * Send OSC message to server
   *
   * @deprecated - use: `server.send.msg([address, arg1, arg2])``
   * @param {String} address - OSC command, referred to as address
   * @param {Array} args
   */
  sendMsg(address, args) {
    this.send.msg([address].concat(args));
  }

  /**
   * Wait for a single OSC response from server matching the supplied args.
   *
   * This is for getting responses async from the server.
   * The first part of the message matches the expected args,
   * and the rest of the message contains the response.
   *
   * The Promise fullfills with any remaining payload including in the message.
   *
   * @param {Array} matchArgs - osc message to match as a single array: `[/done, /notify]`
   * @param {int} timeout - in milliseconds before the Promise is rejected
   * @returns {Promise}
   */
  oscOnce(matchArgs, timeout=4000) {
    return new Promise((resolve, reject) => {
      var subscription = this.receive.subscribe((msg) => {
        var command = msg.slice(0, matchArgs.length);
        if (_.isEqual(command, matchArgs)) {
          var payload = msg.slice(matchArgs.length);
          resolve(payload);
          dispose();
        }
      });

      // if timeout then reject and dispose
      var tid = setTimeout(() => {
        dispose();
        reject('Timed out waiting for OSC response: ' + args);
      }, timeout);

      function dispose() {
        subscription.dispose();
        clearTimeout(tid);
      }
    });
  }

  /**
   * Send an OSC command that expects a reply from the server.
   * Promise fullfills with anything the server response includes
   * after the matched response.
   *
   * @param {Object} callAndResponse - {call: [...], response: [...]}
   * @param {int} timeout
   */
  callAndResponse(callAndResponse, timeout=4000) {
    var promise = this.oscOnce(callAndResponse.response, timeout);
    this.send.msg(callAndResponse.call);
    return promise;
  }

  /**
   * @returns {int}
   */
  nextNodeID() {
    return this.mutateStateAndReturn(keys.NODE_IDS, alloc.increment);
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

  /**
   * Fetch one part of the state,
   * mutate it with the callback,
   * save state and return the result.
   *
   * @returns {any} result
   */
  mutateStateAndReturn(key, fn) {
    var result, state;
    [result, state] = fn(this.state.get(key));
    this.state = this.state.set(key, state);
    return result;
  }
  mutateState(key, fn) {
    this.state = this.state.update(key, Immutable.Map(), fn);
  }

  _allocBlock(key, numChannels) {
    return this.mutateStateAndReturn(key,
      (state) => alloc.allocBlock(state, numChannels));
  }
  _freeBlock(key, index, numChannels) {
    return this.mutateState(key,
      (state) => alloc.freeBlock(state, index, numChannels));
  }
}


/**
 * Boot a server with options and connect
 *
 * @returns {Promise} - resolves with the Server
 */
export function boot(options) {
  return resolveOptions(undefined, options).then((opts) => {
    var s = new Server(opts);
    return s.boot().then(() => s.connect()).then(() => s);
  });
}
