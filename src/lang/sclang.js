/**
 * @ -- flow  -- not quite ready
 */

import _ from 'lodash';
import cuid from 'cuid';
import fs from 'fs';
import temp from 'temp';
import untildify from 'untildify';
import yaml from 'js-yaml';
import path from 'path';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { Promise } from 'bluebird';

import Logger from '../utils/logger';
import { SclangIO, STATES } from './internals/sclang-io';
import resolveOptions from '../utils/resolveOptions';
import { SCError } from '../Errors';
import { SclangResultType } from '../Types';

// This is a private magic built in type.
// It is now undefined, so using any until I track that down.
// 'any' just opts out of type checking
type ChildProcessType = any; // child_process$ChildProcess;

/**
  * This class manages a supercollider language interpreter process
  * and sends messages to and from it using STDIN / STDOUT.
  *
  *  SuperCollider comes with an executable called sclang
  *  which can be communicated with via stdin/stdout
  *  or via OSC.
  *
  *
  * @ member of lang
  * @extends EventEmitter
  */
export default class SCLang extends EventEmitter {
  options: Object;
  process: ?ChildProcessType;
  log: Logger;
  stateWatcher: SclangIO;

  /*
   * @param {object} options - sclang command line options
   */
  constructor(options: Object = {}) {
    super();
    this.options = options || {};
    this.process = null;
    this.log = new Logger(
      this.options.debug,
      this.options.echo,
      this.options.log
    );
    this.log.dbug(this.options);
    this.stateWatcher = this.makeStateWatcher();
  }

  /**
   * build args for sclang
   *
   * ```
   *   -d <path>                      Set runtime directory
   *   -D                             Enter daemon mode (no input)
   *   -g <memory-growth>[km]         Set heap growth (default 256k)
   *   -h                             Display this message and exit
   *   -l <path>                      Set library configuration file
   *   -m <memory-space>[km]          Set initial heap size (default 2m)
   *   -r                             Call Main.run on startup
   *   -s                             Call Main.stop on shutdown
   *   -u <network-port-number>       Set UDP listening port (default 57120)
   *   -i <ide-name>                  Specify IDE name (for enabling IDE-specific class code, default "none")
   *   -a                             Standalone mode
   * ```
   */
  args(options: Object): Array<string> {
    var o = [];
    o.push('-i', 'supercolliderjs');
    if (options.executeFile) {
      o.push(options.executeFile);
    }
    o.push('-u', options.langPort);
    if (options.config) {
      o.push('-l', options.config);
    }
    return o;
  }

  /**
   * makeSclangConfig
   *
   * make sclang_config.yaml as a temporary file
   * with the supplied values
   *
   * This is the config file that sclang reads, specifying
   * includePaths and excludePaths
   *
   */
  makeSclangConfig(config: Object): Promise<string> {
    /**
      write options as yaml to a temp file
      and return the path
    **/
    let str = yaml.safeDump(config, { indent: 4 });
    return new Promise((resolve, reject) => {
      temp.open('sclang-config', function(err, info) {
        if (err) {
          return reject(err);
        }

        fs.write(info.fd, str, err2 => {
          if (err2) {
            reject(err2);
          } else {
            fs.close(info.fd, err3 => {
              if (err3) {
                reject(err3);
              } else {
                resolve(info.path);
              }
            });
          }
        });
      });
    });
  }

  isReady() {
    return this.stateWatcher.state === 'ready';
  }

  /**
   * Start sclang executable as a subprocess.
   *
   * sclang will compile it's class library, and this may result in syntax
   * or compile errors. These errors are parsed and returned in a structured format.
   *
   * Resolves with:
   *
   * ```js
   * {dirs: [compiled directories]}
   * ```
   *
   * or rejects with:
   *
   * ```js
   * {
   *   dirs: [],
   *   compileErrors: [],
   *   parseErrors: [],
   *   duplicateClasses: [],
   *   errors[],
   *   extensionErrors: [],
   *   stdout: 'compiling class library...etc.'
   * }
   * ```
   *
   * @returns {Promise}
   */
  boot(): Promise<*> {
    this.setState(STATES.BOOTING);

    // merge supercollider.js options with any sclang_conf
    let config;
    try {
      config = this.sclangConfigOptions(this.options);
    } catch (e) {
      return Promise.reject(e);
    }

    return this.makeSclangConfig(config).then(configPath => {
      return this.spawnProcess(
        this.options.sclang,
        _.extend({}, this.options, { config: configPath })
      );
    });
  }

  /**
   * spawnProcess - starts the sclang executable
   *
   * sets this.process
   * adds state listeners
   *
   * @param {string} execPath - path to sclang
   * @param {object} commandLineOptions - options for the command line
   *                filtered with this.args so it will only include values
   *                that sclang uses.
   * @returns {Promise}
   *     resolves null on successful boot and compile
   *     rejects on failure to boot or failure to compile the class library
   */
  spawnProcess(execPath: string, commandLineOptions: Object): Promise<*> {
    return new Promise((resolve, reject) => {
      var done = false;

      this.process = this._spawnProcess(
        execPath,
        this.args(commandLineOptions)
      );
      if (!(this.process && this.process.pid)) {
        reject(new Error(`Failed to spawn process: ${execPath}`));
        return;
      }

      var bootListener = state => {
        if (state === STATES.READY) {
          done = true;
          this.removeListener('state', bootListener);
          resolve(this.stateWatcher.result);
        } else if (state === STATES.COMPILE_ERROR) {
          done = true;
          reject(new SCError('CompileError', this.stateWatcher.result));
          this.removeListener('state', bootListener);
          // probably should remove all listeners
        }
      };

      // temporary listener until booted ready or compileError
      // that removes itself
      this.addListener('state', bootListener);

      setTimeout(
        () => {
          if (!done) {
            this.log.err('Timeout waiting for sclang to boot');
            // force it to finalize
            this.stateWatcher.processOutput();
            // bootListener above will reject the promise
            this.stateWatcher.setState(STATES.COMPILE_ERROR);
            this.removeListener('state', bootListener);
          }
        },
        10000
      );

      // long term listeners
      if (this.process) {
        this.installListeners(this.process, Boolean(this.options.stdin));
      }
    });
  }

  _spawnProcess(
    execPath: string,
    commandLineOptions: Array<string>
  ): ChildProcessType {
    return spawn(execPath, commandLineOptions, {
      cwd: path.dirname(execPath)
    });
  }

  /**
   * sclangConfigOptions
   *
   * Builds the options that will be written to the config file that is read by sclang
   * If supercolliderjs-conf specifies a sclang_conf path
   * then this is read and any includePaths and excludePaths are merged
   *
   * throws error if config cannot be read
   *
   * @param {object} options - supercolliderJs options
   * @returns {object} - sclang_config variables
   */
  sclangConfigOptions(options: Object = {}) {
    let runtimeIncludePaths = [
      path.resolve(__dirname, '../../lib/supercollider-js')
    ];
    let defaultConf = {
      postInlineWarnings: false,
      includePaths: [],
      excludePaths: []
    };
    let sclang_conf = defaultConf;

    if (options.sclang_conf) {
      try {
        sclang_conf = yaml.safeLoad(
          fs.readFileSync(untildify(options.sclang_conf), 'utf8')
        );
      } catch (e) {
        // By default allow a missing sclang_conf file
        // so that the language can create it on demand if you use Quarks or LanguageConfig.
        if (!options.failIfSclangConfIsMissing) {
          // Was the sclang_conf just in the defaults or was it explicitly set ?
          this.log.dbug(e);
          sclang_conf = defaultConf;
        } else {
          throw new Error(
            'Cannot open or read specified sclang_conf ' + options.sclang_conf
          );
        }
      }
    }

    return {
      includePaths: _.union(
        sclang_conf.includePaths,
        options.includePaths,
        runtimeIncludePaths
      ),
      excludePaths: _.union(sclang_conf.excludePaths, options.excludePaths),
      postInlineWarning: _.isUndefined(options.postInlineWarnings)
        ? Boolean(sclang_conf.postInlineWarnings)
        : Boolean(options.postInlineWarnings)
    };
  }

  makeStateWatcher(): SclangIO {
    let stateWatcher = new SclangIO(this);
    for (let name of ['interpreterLoaded', 'error', 'stdout', 'state']) {
      stateWatcher.on(name, (...args) => {
        this.emit(name, ...args);
      });
    }
    return stateWatcher;
  }

  /**
    * listen to events from process and pipe stdio to the stateWatcher
    */
  installListeners(
    subprocess: ChildProcessType,
    listenToStdin: boolean = false
  ) {
    if (listenToStdin) {
      // stdin of the global top level nodejs process
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => {
        if (chunk) {
          this.write(chunk, null, true);
        }
      });
    }
    subprocess.stdout.on('data', data => {
      var ds = String(data);
      this.log.dbug(ds);
      this.stateWatcher.parse(ds);
    });
    subprocess.stderr.on('data', data => {
      var error = String(data);
      this.log.stderr(error);
      this.emit('stderr', error);
    });
    subprocess.on('error', err => {
      this.log.err('ERROR:' + err, 'error');
      this.emit('stderr', err);
    });
    subprocess.on('close', (code, signal) => {
      this.log.dbug('close ' + code + signal);
      this.emit('exit', code);
      this.setState(null);
    });
    subprocess.on('exit', (code, signal) => {
      this.log.dbug('exit ' + code + signal);
      this.emit('exit', code);
      this.setState(null);
    });
    subprocess.on('disconnect', () => {
      this.log.dbug('disconnect');
      this.emit('exit');
      this.setState(null);
    });
  }

  /**
   * write
   *
   * Send a raw string to sclang to be interpreted
   * callback is called after write is complete.
   */
  write(chunk: string, callback: ?Function, noEcho: boolean) {
    if (!noEcho) {
      this.log.stdin(chunk);
    }
    this.log.dbug(chunk);
    this.process.stdin.write(chunk, 'UTF-8');
    // Send the escape character which is interpreted by sclang as:
    // "evaluate the currently accumulated command line as SC code"
    this.process.stdin.write('\x0c', null, callback);
  }

  /**
    * storeSclangConf
    *
    * Store the original configuration path
    * so that it can be accessed by the modified Quarks methods
    * to store into the correct conf file.
    */
  storeSclangConf(): Promise<SCLang> {
    if (this.options.sclang_conf) {
      var configPath = path.resolve(untildify(this.options.sclang_conf));
      var setConfigPath = 'SuperColliderJS.sclangConf = "' +
        configPath +
        '";\n\n';
      return this.interpret(setConfigPath, null, true, true, true).then(
        () => this
      );
    } else {
      return Promise.resolve(this);
    }
  }

  /**
   * Interprets code in sclang and returns a Promise.
   *
   * @param {String} code
   *        source code to evaluate
   * @param {String} nowExecutingPath
            set thisProcess.nowExecutingPath
   *        for use in a REPL to evaluate text in a file
   *        and let sclang know what file it is executing.
   * @param {Boolean} asString
   *        return result .asString for post window
   *        otherwise returns result as a JSON object
   * @param {Boolean} postErrors
   *        call error.reportError on any errors
   *        which posts call stack, receiver, args, etc
   * @param {Boolean} getBacktrace
   *        return full backtrace
   * @returns {Promise} results - which resolves with result as JSON or rejects with SCLangError.
   */
  interpret(
    code: string,
    nowExecutingPath: ?string,
    asString: boolean,
    postErrors: boolean,
    getBacktrace: boolean
  ): Promise<SclangResultType> {
    return new Promise((resolve, reject) => {
      var escaped = code
        .replace(/[\n\r]/g, '__NL__')
        .replace(/\\/g, '__SLASH__')
        .replace(/\"/g, '\\"');
      var guid = cuid();

      var args = [
        '"' + guid + '"',
        '"' + escaped + '"',
        nowExecutingPath ? '"' + nowExecutingPath + '"' : 'nil',
        asString ? 'true' : 'false',
        postErrors ? 'true' : 'false',
        getBacktrace ? 'true' : 'false'
      ].join(',');

      this.stateWatcher.registerCall(guid, { resolve, reject });
      this.write('SuperColliderJS.interpret(' + args + ');', null, true);
    });
  }

  /**
   * executeFile
   */
  executeFile(filename: string) {
    return new Promise((resolve, reject) => {
      var guid = cuid();
      this.stateWatcher.registerCall(guid, { resolve, reject });
      this.write(
        `SuperColliderJS.executeFile("${guid}", "${filename}")`,
        null,
        true
      );
    });
  }

  /**
   * @private
   */
  setState(state: ?string) {
    this.stateWatcher.setState(state);
  }

  compilePaths(): [string] {
    return this.stateWatcher.result.dirs;
  }

  quit(): Promise<SCLang> {
    return new Promise(resolve => {
      var cleanup = () => {
        this.process = null;
        this.setState(null);
        resolve(this);
      };
      if (this.process) {
        this.process.once('exit', cleanup);
        // request a polite shutdown
        this.process.kill('SIGINT');
        setTimeout(
          () => {
            // 3.6.6 doesn't fully respond to SIGINT
            // but SIGTERM causes it to crash
            if (this.process) {
              this.process.kill('SIGTERM');
              cleanup();
            }
          },
          250
        );
      } else {
        cleanup();
      }
    });
  }
}

/**
  * Boots an sclang interpreter, resolving options and connecting.
  *
  * @memberof lang
  *
  * @param {Object} commandLineOptions - A dict of options to be merged into the loaded config. Command line options to be supplied to sclang --sclang=/some/path/to/sclang
  * commandLineOptions.config - Explicit path to a yaml config file
  * If undefined then it will look for config files in:
  *    - .supercollider.yaml
  *    - ~/.supercollider.yaml
  */
export function boot(commandLineOptions: Object = {}): Promise<SCLang> {
  return resolveOptions(
    commandLineOptions.config,
    commandLineOptions
  ).then(opts => {
    var sclang = new SCLang(opts);
    return sclang.boot().then(() => {
      return sclang.storeSclangConf().then(() => sclang);
    });
  });
}

// deprec. will be removed in 1.0
SCLang.boot = boot;
