/**
 *
 * Server - boots the SuperCollider synthesis server
 *
 *  SuperCollider comes with an executable called scsynth
 *  which can be communicated with via udp OSC
 *
 *  The primary way to send messages in with
 *  eg. server.send.msg('/s_new', ['defName', 440])

 *  and the responses are emitted as 'OSC'
 *  eg. server.receive.subscribe(function(msg) function(msg) {  ...  });
 *
 * methods:
 *   boot        - boot an scsynth process
 *   quit
 *   connect     - connect via udp OSC
 *   disconnect
 *   send.msg     - send an OSC message
 *
 *
 */

import {EventEmitter} from 'events';
import {Observable, Subject} from 'rx';
import {spawn} from 'child_process';
import * as _ from 'underscore';
import * as dgram from 'dgram';
import * as osc from 'osc-min';
import {Promise} from 'bluebird';

import SendOSC from './internals/SendOSC';
import {parseMessage} from './osc/utils';
import {notify} from './osc/msg';
import defaultOptions from './default-server-options.json';
import Logger from '../utils/logger';
import resolveOptions from '../utils/resolveOptions';
import ServerState from './ServerState';


export class Server extends EventEmitter {

  /**
   * @param {Object} options - command line options for scsynth
   * @param {Store} stateStore - optional parent Store for allocators and node watchers
   */
  constructor(options={}, stateStore=null) {
    super();
    this.options = _.defaults(options, defaultOptions);
    this.address = this.options.host + ':' + this.options.port;
    this.process = null;
    this.isRunning = false;

    /**
     * @member {SendOSC} send - supports server.send.msg() and server.send.bundle()
     *            You can also subscribe to it and get osc messages and bundles echoed
     *            to you for debugging purposes.
     */
    this.send = new SendOSC();
    /**
     * @member {Rx.Subject} receive - a subscribeable stream of OSC events received
     */
    this.receive = new Subject();
    /**
     * @member {Rx.Subject} stdout - a subscribeable stream of stdout printed by the scsynth process
     */
    this.stdout = new Subject();
    /**
     * @member {Rx.Subject} processEvents - a subscribeable stream of events related to the scsynth process
     */
    this.processEvents = new Subject();

    this._initLogger();
    this._initEmitter();
    this._initSender();

    this._serverObservers = {};

    /**
     * @member {ServerState} state - Holds the mutable server state including
     *                            allocators and the node state watcher.
     *    If a parent stateStore is supplied then it will store within that.
     */
    this.state = new ServerState(this, stateStore);
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

  /**
    * emit signals are deprecated and will be removed in 1.0
    * use instead server.{channel}.subscribe((event) => { })
    *
    * Event Emitter emits:
    *    'out'   - stdout text from the server
    *    'error' - stderr text from the server or OSC error messages
    *    'exit'  - when server exits
    *    'close' - when server closes the UDP connection
    *    'OSC'   - OSC responses from the server
   */
  _initEmitter() {
    this.receive.subscribe((msg) => {
      this.emit('OSC', msg);
    });
    this.processEvents.subscribe(() => {}, (err) => this.emit('exit', err));
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
   *
   * @returns {Promise}
   */
  boot() {
    return new Promise((resolve, reject) => {
      this.isRunning = false;

      this._spawnProcess();

      this._serverObservers.stdout = Observable.fromEvent(this.process.stdout, 'data', (data) => String(data));
      this._serverObservers.stdout.subscribe((e) => this.stdout.onNext(e));
      this._serverObservers.stderr = Observable.fromEvent(this.process.stderr, 'data')
        .subscribe((out) => {
          // just pipe it into the stdout object's error stream
          this.stdout.onError(out);
        });

      // Keep a local buffer of the stdout text because on Windows it can be split into odd chunks.
      var stdoutBuffer = '';
      // watch for ready message
      this._serverObservers.stdout.takeWhile((text) => {
        stdoutBuffer += text;
        return !(stdoutBuffer.match(/SuperCollider 3 server ready/));
      })
        .subscribe(
          () => {},
          this.log.err,
          () => { // onComplete
            stdoutBuffer = '';
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

  _spawnProcess() {
    var
      execPath = this.options.scsynth,
      args = this.args();

    this.processEvents.onNext('Start process: ' + execPath + ' ' + args.join(' '));
    this.process = spawn(execPath, args, {
      cwd: this.options.cwd
    });
    this.processEvents.onNext('pid: ' + this.process.pid);

    // when this parent process dies, kill child process
    process.on('exit', () => {
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

  /**
   * @private
   */
  disconnect() {
    if (this.osc) {
      this.osc.close();
      delete this.osc;
    }
    this._serverObservers.forEach((obs) => obs.dispose());
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
        reject('Timed out waiting for OSC response: ' + matchArgs);
      }, timeout);

      function dispose() {
        subscription.dispose();
        clearTimeout(tid);
      }
    });
  }

  /**
   * Send an OSC command that expects a reply from the server,
   * and resolves with the response.
   *
   * This is for getting responses async from the server.
   * The first part of the message matches the expected args,
   * and the rest of the message contains the response.
   *
   * @param {Object} callAndResponse - Object with call: [osc_msg, 1, 2], response: [osc_response, 1, 2, 3]
   * @param {int} timeout - in milliseconds before rejecting the Promise
   * @returns {Promise} - resolves with all values the server responsed with after the matched response.
   */
  callAndResponse(callAndResponse, timeout=4000) {
    var promise = this.oscOnce(callAndResponse.response, timeout);
    this.send.msg(callAndResponse.call);
    return promise;
  }
}


/**
 * Boot a server with options and connect
 *
 * @param {Object} options - command line options for server
 * @param {Store} store - optional Dryadic Store to hold Server state
 * @returns {Promise} - resolves with the Server
 */
export function boot(options={}, store=null) {
  return resolveOptions(undefined, options).then((opts) => {
    var s = new Server(opts, store);
    return s.boot().then(() => s.connect()).then(() => s);
  });
}
