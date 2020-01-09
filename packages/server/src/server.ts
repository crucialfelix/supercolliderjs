import Logger from "@supercollider/logger";
import { packBundle, packMessage, unpackMessage } from "@supercollider/osc";
import { spawn } from "child_process";
import * as dgram from "dgram";
import { EventEmitter } from "events";
import _ from "lodash";
import path from "path";
import { IDisposable, Observable, Subject } from "rx";

import SendOSC from "./internals/SendOSC";
import Store from "./internals/Store";
import { defaults, resolveOptions, ServerArgs, ServerOptions } from "./options";
import { MsgType, OscType } from "./osc-types";
import { CallAndResponse, notify } from "./osc/msg";
import { parseMessage } from "./osc/utils";
import ServerState from "./ServerState";

interface ServerObservers {
  // string | OSCMsg
  [name: string]: Observable<any> | IDisposable;
}

/**
 * Server - starts a SuperCollider synthesis server (scsynth)
 * as a child process. Enables OSC communication, subscribe to process events,
 * send call and response OSC messages.
 *
 * SuperCollider comes with an executable called scsynth
 * which can be communicated with via OSC.
 *
 * To send raw OSC messages:
 * ```js
 * server.send.msg('/s_new', ['defName', 440])
 * ```
 *
 * Raw OSC responses can be subscribed to:
 * ```js
 * server.receive.subscribe(function(msg) {
 *   console.log(msg);
 * });
 * ```
 */
export default class Server extends EventEmitter {
  options: ServerOptions;

  address: string;

  /**
   * The process id that nodejs spawn() returns
   */
  process: any;

  isRunning: boolean;

  /**
   * Supports `server.send.msg()` and `server.send.bundle()`
   *
   * You can also subscribe to it and get the OSC messages
   * and bundles that are being sent echoed to you for
   * debugging purposes.
   */
  send: SendOSC;

  /**
   * A subscribeable stream of OSC events received.
   */
  receive: Subject<MsgType>;

  /**
   * A subscribeable stream of STDOUT printed by the scsynth process.
   */
  stdout: Subject<string>;

  /**
   * A subscribeable stream of events related to the scsynth process.
   * Used internally.
   */
  processEvents: Subject<string | Error>;

  /**
   * Holds the mutable server state
   * including allocators and the node state watcher.
   * If a parent stateStore is supplied then it will store within that.
   */
  state: ServerState;

  /**
   * The logger used to print messages to the console.
   */
  log: Logger;

  private osc?: dgram.Socket;

  private _serverObservers: ServerObservers;

  /**
   * @param stateStore - optional parent Store for allocators and node watchers
   */
  constructor(options: ServerArgs = {}, stateStore?: Store) {
    super();
    this.options = resolveOptions(options);
    this.address = this.options.host + ":" + this.options.serverPort;
    this.process = null;
    this.isRunning = false;

    this.send = new SendOSC();
    this.receive = new Subject();
    this.stdout = new Subject();
    this.processEvents = new Subject();

    this.log = this._initLogger();
    this._initEmitter();
    this._initSender();

    this._serverObservers = {};

    this.state = new ServerState(this, stateStore);
  }

  private _initLogger(): Logger {
    // scsynth.server options this Server.options
    const log = new Logger(this.options.debug, this.options.echo, this.options.log);
    this.send.subscribe(event => {
      // will be a type:msg or type:bundle
      // if args has a type: Buffer in it then compress that
      let out = JSON.stringify(
        event.payload || event,
        (k: string, v: any): any => {
          if (k === "data" && _.isArray(v)) {
            return _.reduce(v, (memo: string, n: number): string => memo + n.toString(16), "");
          }
          return v;
        },
        2,
      );
      if (!this.osc) {
        out = "[NOT CONNECTED] " + out;
      }
      log.sendosc(out);
    });
    this.receive.subscribe(
      o => {
        log.rcvosc(o);
        // log all /fail responses as error
        if (o[0] === "/fail") {
          log.err(o);
        }
      },
      (err: Error) => log.err(err),
    );
    this.stdout.subscribe(
      o => {
        // scsynth doesn't send ERROR messages to stderr
        // if ERROR or FAILURE in output then redirect as though it did
        // so it shows up in logs
        if (o.match(/ERROR|FAILURE/)) {
          log.stderr(o);
        } else {
          log.stdout(o);
        }
      },
      (err: Error) => log.stderr(err),
    );
    this.processEvents.subscribe(
      o => log.dbug(o),
      (err: Error) => log.err(err),
    );

    return log;
  }

  /**
   * Event Emitter emits:
   *    'out'   - stdout text from the server
   *    'error' - stderr text from the server or OSC error messages
   *    'exit'  - when server exits
   *    'close' - when server closes the UDP connection
   *    'OSC'   - OSC responses from the server
   *
   * Emit signals are deprecated and will be removed in 1.0
   * TODO: remove
   *
   * @deprecated
   *
   * Instead use ```server.{channel}.subscribe((event) => { })```
   *
   */
  private _initEmitter(): void {
    this.receive.subscribe(msg => {
      this.emit("OSC", msg);
    });
    this.processEvents.subscribe(
      () => {},
      err => this.emit("exit", err),
    );
    this.stdout.subscribe(
      out => this.emit("out", out),
      out => this.emit("stderr", out),
    );
  }

  private _initSender(): void {
    this.send.on("msg", msg => {
      if (this.osc) {
        const buf = packMessage(msg);
        this.osc.send(buf, 0, buf.length, parseInt(this.options.serverPort), this.options.host);
      }
    });
    this.send.on("bundle", bundle => {
      if (this.osc) {
        const buf = packBundle(bundle);
        this.osc.send(buf, 0, buf.length, parseInt(this.options.serverPort), this.options.host);
      }
    });
  }

  /**
   * Format the command line args for scsynth.
   *
   * The args built using the options supplied to `Server(options)` or `sc.server.boot(options)`
   *
   * ```js
   *  sc.server.boot({device: 'Soundflower (2ch)'});
   *  sc.server.boot({serverPort: '11211'});
   *  ```
   *
   * Supported arguments:
   *
   *     numAudioBusChannels
   *     numControlBusChannels
   *     numInputBusChannels
   *     numOutputBusChannels
   *     numBuffers
   *     maxNodes
   *     maxSynthDefs
   *     blockSize
   *     hardwareBufferSize
   *     memSize
   *     numRGens - max random generators
   *     numWireBufs
   *     sampleRate
   *     loadDefs - (0 or 1)
   *     inputStreamsEnabled - "01100" means only the 2nd and 3rd input streams
   *                          on the device will be enabled
   *     outputStreamsEnabled,
   *     device - name of hardware device
   *            or array of names for [inputDevice, outputDevice]
   *     verbosity: 0 1 2
   *     restrictedPath
   *     ugenPluginsPath
   *     password - for TCP logins open to the internet
   *     maxLogins - max users that may login
   *
   * Arbitrary arguments can be passed in as options.commandLineArgs
   * which is an array of strings that will be space-concatenated
   * and correctly shell-escaped.
   *
   * Host is currently ignored: it is always local on the same machine.
   *
   * See ServerOptions documentation: http://danielnouri.org/docs/SuperColliderHelp/ServerArchitecture/ServerOptions.html
   *
   * @return List of non-default args
   */
  args(): string[] {
    const flagMap = {
      numAudioBusChannels: "-a",
      numControlBusChannels: "-c",
      numInputBusChannels: "-i",
      numOutputBusChannels: "-o",
      numBuffers: "-b",
      maxNodes: "-n",
      maxSynthDefs: "-d",
      blockSize: "-z",
      hardwareBufferSize: "-Z",
      memSize: "-m",
      numRGens: "-r",
      numWireBufs: "-w",
      sampleRate: "-S",
      loadDefs: "-D", // boolean
      inputStreamsEnabled: "-I",
      outputStreamsEnabled: "-O",
      device: "-H",
      verbosity: "-V",
      zeroConf: "-R",
      restrictedPath: "-P",
      ugenPluginsPath: "-U",
      password: "-p",
      maxLogins: "-l",
    };

    const { serverPort, protocol, commandLineOptions } = this.options;

    const opts = ["-u", serverPort];

    if (protocol === "tcp") {
      throw new Error("Only udp sockets are supported at this time.");
    }

    _.forEach(this.options, (option, argName) => {
      const flag = flagMap[argName];
      if (flag) {
        if (option !== defaults[argName]) {
          opts.push(flag);
          if (_.isArray(option)) {
            opts.push(...option);
          } else if (_.isString(option)) {
            opts.push(option);
          } else {
            this.log.err(`Bad type in server options: ${argName} ${option} ${typeof option}`);
          }
        }
      }
    });

    if (_.isArray(commandLineOptions)) {
      opts.push(...commandLineOptions);
    }

    return opts.map(String);
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
  boot(): Promise<Server> {
    return new Promise((resolve, reject) => {
      this.isRunning = false;

      try {
        this._spawnProcess();
      } catch (e) {
        reject(e);
      }

      this._serverObservers.stdout = Observable.fromEvent(this.process.stdout, "data", data => String(data));
      this._serverObservers.stdout.subscribe(e => this.stdout.onNext(e));
      this._serverObservers.stderr = Observable.fromEvent(this.process.stderr, "data").subscribe(out => {
        // just pipe it into the stdout object's error stream
        this.stdout.onError(out);
      });

      // Keep a local buffer of the stdout text because on Windows it can be split into odd chunks.
      let stdoutBuffer = "";
      // watch for ready message
      this._serverObservers.stdout
        .takeWhile((text: string): boolean => {
          stdoutBuffer += text;
          return !stdoutBuffer.match(/SuperCollider 3 server ready/);
        })
        .subscribe(
          () => {},
          this.log.err,
          () => {
            // onComplete
            stdoutBuffer = "";
            this.isRunning = true;
            resolve(this);
          },
        );

      setTimeout(() => {
        if (!this.isRunning) {
          reject(new Error("Server failed to start in 3000ms"));
        }
      }, 3000);
    });
  }

  _spawnProcess(): void {
    const execPath = this.options.scsynth,
      args = this.args();

    if (!execPath) {
      throw new Error(`Missing options.scsynth executable path`);
    }

    const logMsg = "Start process: " + execPath + " " + args.join(" ");
    this.processEvents.onNext(logMsg);

    const options = {
      cwd: this.options.cwd || path.dirname(execPath),
      detached: false,
      // Environment variables to set for server process
      // eg. SC_JACK_DEFAULT_INPUTS: "system:capture_1,system:capture_2"
      env: this.options.env ? (this.options.env as NodeJS.ProcessEnv) : undefined,
    };

    this.log.dbug({ execPath, args, options });
    this.process = spawn(execPath, args, options);

    if (!this.process.pid) {
      const error = `Failed to boot ${execPath}`;
      this.processEvents.onError(error);
      throw new Error(error);
    }

    this.processEvents.onNext("pid: " + this.process.pid);

    // when this parent process dies, kill child process
    const killChild = (): void => {
      if (this.process) {
        this.process.kill("SIGTERM");
        this.process = null;
      }
    };

    process.on("exit", killChild);

    this.process.on("error", (err: Error) => {
      this.processEvents.onError(err);
      this.isRunning = false;
      // this.disconnect()
    });
    this.process.on("close", (code: number | null, signal: string | null) => {
      this.processEvents.onError("Server closed. Exit code: " + code + " signal: " + signal);
      this.isRunning = false;
      // this.disconnect()
    });
    this.process.on("exit", (code: number | null, signal: string | null) => {
      this.processEvents.onError("Server exited. Exit code: " + code + " signal: " + signal);
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
  quit(): void {
    if (this.process) {
      this.disconnect();
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }

  /**
   * Establish connection to scsynth via OSC socket
   *
   * @returns {Promise} - resolves when udp responds
   */
  connect(): Promise<Server> {
    return new Promise((resolve, reject) => {
      const udpListening = "udp is listening";

      this.osc = dgram.createSocket("udp4");

      this.osc.on("listening", () => {
        this.processEvents.onNext(udpListening);
      });
      this.osc.on("close", e => {
        this.processEvents.onNext("udp closed: " + e);
        this.disconnect();
      });

      // pipe events to this.receive
      this._serverObservers.oscMessage = Observable.fromEvent(this.osc, "message", msgbuf => unpackMessage(msgbuf));
      this._serverObservers.oscMessage.subscribe(e => this.receive.onNext(parseMessage(e)));

      this._serverObservers.oscError = Observable.fromEvent(this.osc, "error");
      this._serverObservers.oscError.subscribe(e => {
        this.receive.onError(e);
        reject(e);
      });

      // this will trigger a response from server
      // which will cause a udp listening event.
      // After server responds then we are truly connected.
      this.callAndResponse(notify()).then(() => {
        resolve(this);
      });
    });
  }

  private disconnect(): void {
    if (this.osc) {
      this.osc.close();
      delete this.osc;
    }

    // TODO: its the subscriptions that need to be disposed, these are the Observables
    // this._serverObservers.forEach((obs) => obs.dispose());
    // for (var key in this._serverObservers) {
    //   console.log(key, this._serverObservers[key], this._serverObservers[key].dispose);
    //   this._serverObservers[key].dispose();
    // }
    this._serverObservers = {};
  }

  /**
   * Send OSC message to server
   *
   * @deprecated - use: `server.send.msg([address, arg1, arg2])``
   * @param {String} address - OSC command string eg. `/s_new` which is referred to in OSC as the address
   * @param {Array} args
   */
  sendMsg(address: string, args: OscType[]): void {
    this.send.msg([address, ...args]);
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
  oscOnce(matchArgs: MsgType, timeout = 4000): Promise<MsgType> {
    return new Promise((resolve: Function, reject: Function) => {
      const subscription = this.receive.subscribe(msg => {
        const command = msg.slice(0, matchArgs.length);
        if (_.isEqual(command, matchArgs)) {
          const payload = msg.slice(matchArgs.length);
          resolve(payload);
          dispose();
        }
      });

      // if timeout then reject and dispose
      const tid = setTimeout(() => {
        dispose();
        reject(new Error(`Timed out waiting for OSC response: ${JSON.stringify(matchArgs)}`));
      }, timeout);

      function dispose(): void {
        subscription.dispose();
        clearTimeout(tid);
      }
    });
  }

  /**
   * Send an OSC command that expects a reply from the server,
   * returning a `Promise` that resolves with the response.
   *
   * This is for getting responses async from the server.
   * The first part of the message matches the expected args,
   * and the rest of the message contains the response.
   *
   *  ```js
   *  {
   *      call: ['/some_osc_msg', 1, 2],
   *      response: ['/expected_osc_response', 1, 2, 3]
   *  }
   *   ```
   * @param {int} timeout - in milliseconds before rejecting the `Promise`
   * @returns {Promise} - resolves with all values the server responsed with after the matched response.
   */
  callAndResponse(callAndResponse: CallAndResponse, timeout = 4000): Promise<MsgType> {
    const promise = this.oscOnce(callAndResponse.response, timeout);
    // if it's valid to send a msg with an array on the end,
    // then change the definition of Msg
    this.send.msg(callAndResponse.call);
    return promise;
  }
}

/**
 * Boot a server with options and connect
 *
 * @param {object} options - command line options for server
 * @param {Store} store - optional external Store to hold Server state
 * @returns {Promise} - resolves with the Server
 */
export async function boot(options: ServerArgs = {}, store: any = null): Promise<Server> {
  const s: Server = new Server(options, store);
  await s.boot();
  await s.connect();
  return s;
}
