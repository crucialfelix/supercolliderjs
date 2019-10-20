import Logger from "@supercollider/logger";
import { ChildProcess, spawn } from "child_process";
import cuid from "cuid";
import { EventEmitter } from "events";
import fs from "fs";
import yaml from "js-yaml";
import _ from "lodash";
import path from "path";
import temp from "temp";
import untildify from "untildify";

import { SCError } from "./Errors";
import { SclangCompileResult, SclangIO, State } from "./internals/sclang-io";
import { resolveOptions, SCLangConf, SCLangOptions } from "./options";

/**
 * TODO: type this better
 * but really it could be just about anything
 */
export type SclangResultType = any;

/** Args for constructor */
export type SCLangArgs = Partial<SCLangOptions>;

/**
 * This class manages a supercollider language interpreter process
 * and sends messages to and from it using STDIN / STDOUT.
 *
 *  SuperCollider comes with an executable called sclang
 *  which can be communicated with via stdin/stdout
 *  or via OSC.
 *
 * @memberof of lang
 */
export default class SCLang extends EventEmitter {
  options: SCLangOptions;
  process?: ChildProcess;
  log: Logger;
  stateWatcher: SclangIO;

  /*
   * @param {object} options - sclang command line options
   */
  constructor(options?: SCLangArgs) {
    super();
    this.options = resolveOptions(options);

    this.log = new Logger(this.options.debug, this.options.echo, this.options.log);
    this.log.dbug(this.options);
    this.stateWatcher = this.makeStateWatcher();
  }

  /**
   * command line args for sclang
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
  args(options: {
    /**
     * Port for lang to connect to scsynth from
     */
    langPort?: number;
    /**
     * Path to sclang conf file
     */
    conf?: string;
    /**
     * Path to .scd file to execute
     */
    executeFile?: string;
  }): string[] {
    const o: string[] = [];
    o.push("-i", "supercolliderjs");
    if (options.executeFile) {
      o.push(options.executeFile);
    }
    if (options.langPort) {
      o.push("-u", String(options.langPort));
    }
    if (options.conf) {
      o.push("-l", options.conf);
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
   * Resolves with path of written config file.
   */
  makeSclangConfig(conf: SCLangConf): Promise<string> {
    /**
      write options as yaml to a temp file
      and return the path
    **/
    const str = yaml.safeDump(conf, { indent: 4 });
    return new Promise((resolve, reject) => {
      temp.open("sclang-conf", function(err, info) {
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

  isReady(): boolean {
    return this.stateWatcher.state === State.READY;
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
   */
  async boot(): Promise<SclangCompileResult> {
    this.setState(State.BOOTING);

    // merge supercollider.js options with any sclang_conf
    const conf = this.sclangConfigOptions(this.options);
    const confPath = await this.makeSclangConfig(conf);
    return this.spawnProcess(this.options.sclang, _.extend({}, this.options, { conf: confPath }));
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
  spawnProcess(execPath: string, commandLineOptions: object): Promise<SclangCompileResult> {
    return new Promise((resolve, reject) => {
      let done = false;

      this.process = this._spawnProcess(execPath, this.args(commandLineOptions));
      if (!(this.process && this.process.pid)) {
        // check if path exists
        const exists = fs.existsSync(execPath);
        reject(new Error(`Failed to spawn process! ${exists ? "" : " Executable not found."} path: ${execPath}`));
        return;
      }

      const bootListener = (state: State): void => {
        if (state === State.READY) {
          done = true;
          this.removeListener("state", bootListener);
          resolve(this.stateWatcher.result);
        } else if (state === State.COMPILE_ERROR) {
          done = true;
          reject(new SCError("CompileError", this.stateWatcher.result));
          this.removeListener("state", bootListener);
          // probably should remove all listeners
        }
      };

      // temporary listener until booted ready or compileError
      // that removes itself
      this.addListener("state", bootListener);

      setTimeout(() => {
        if (!done) {
          const err = `Timeout waiting for sclang to boot pid:${this.process && this.process.pid}`;
          this.log.err(err);
          // force it to finalize
          this.stateWatcher.processOutput();
          // bootListener above will reject the promise
          this.stateWatcher.setState(State.COMPILE_ERROR);
          this.removeListener("state", bootListener);
          reject(new Error(err));
        }
      }, 10000);

      // long term listeners
      if (this.process) {
        this.installListeners(this.process, Boolean(this.options.stdin));
      }
    });
  }

  _spawnProcess(execPath: string, commandLineOptions: string[]): ChildProcess {
    return spawn(execPath, commandLineOptions, {
      cwd: path.dirname(execPath),
    });
  }

  /**
   * sclangConfigOptions
   *
   * Builds the options that will be written to the conf file that is read by sclang
   * If supercolliderjs-conf specifies a sclang_conf path
   * then this is read and any includePaths and excludePaths are merged
   *
   * throws error if conf cannot be read
   */
  sclangConfigOptions(options: SCLangOptions): SCLangConf {
    const runtimeIncludePaths = [path.resolve(__dirname, "./supercollider-js")];

    const defaultConf: SCLangConf = {
      postInlineWarnings: false,
      includePaths: [],
      excludePaths: [],
    };
    let conf = defaultConf;

    if (options.sclang_conf) {
      try {
        conf = yaml.safeLoad(fs.readFileSync(untildify(options.sclang_conf), "utf8"));
      } catch (e) {
        // By default allow a missing sclang_conf file
        // so that the language can create it on demand if you use Quarks or LanguageConfig.
        if (!options.failIfSclangConfIsMissing) {
          // Was the sclang_conf just in the defaults or was it explicitly set ?
          this.log.dbug(e);
          conf = defaultConf;
        } else {
          throw new Error("Cannot open or read specified sclang_conf " + options.sclang_conf);
        }
      }
    }

    return {
      includePaths: _.union<string>(conf.includePaths, options.conf.includePaths, runtimeIncludePaths),
      excludePaths: _.union<string>(conf.excludePaths, options.conf.excludePaths),
      postInlineWarnings: _.isUndefined(options.conf.postInlineWarnings)
        ? conf.postInlineWarnings
        : !!options.conf.postInlineWarnings,
    };
  }

  makeStateWatcher(): SclangIO {
    const stateWatcher = new SclangIO();
    for (const name of ["interpreterLoaded", "error", "stdout", "state"]) {
      stateWatcher.on(name, (...args) => {
        this.emit(name, ...args);
      });
    }
    return stateWatcher;
  }

  /**
   * listen to events from process and pipe stdio to the stateWatcher
   */
  installListeners(subprocess: ChildProcess, listenToStdin = false): void {
    if (listenToStdin) {
      // stdin of the global top level nodejs process
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", chunk => {
        if (chunk) {
          this.write(chunk, true);
        }
      });
    }
    if (subprocess.stdout) {
      subprocess.stdout.on("data", data => {
        const ds = String(data);
        this.log.dbug(ds);
        this.stateWatcher.parse(ds);
      });
    }
    if (subprocess.stderr) {
      subprocess.stderr.on("data", data => {
        const error = String(data);
        this.log.stderr(error);
        this.emit("stderr", error);
      });
    }
    subprocess.on("error", err => {
      this.log.err("ERROR:" + err);
      this.emit("stderr", err);
    });
    subprocess.on("close", (code, signal) => {
      this.log.dbug("close " + code + signal);
      this.emit("exit", code);
      this.setState(State.NULL);
    });
    subprocess.on("exit", (code, signal) => {
      this.log.dbug("exit " + code + signal);
      this.emit("exit", code);
      this.setState(State.NULL);
    });
    subprocess.on("disconnect", () => {
      this.log.dbug("disconnect");
      this.emit("exit");
      this.setState(State.NULL);
    });
  }

  /**
   * write
   *
   * Send a raw string to sclang to be interpreted
   * callback is called after write is complete.
   */
  write(chunk: string, noEcho: boolean): void {
    if (!noEcho) {
      this.log.stdin(chunk);
    }
    this.log.dbug(chunk);
    if (this.process && this.process.stdin) {
      this.process.stdin.write(chunk, "UTF-8");
      // Send the escape character which is interpreted by sclang as:
      // "evaluate the currently accumulated command line as SC code"
      this.process.stdin.write("\x0c", "UTF-8", error => error && this.log.err(error));
    }
  }

  /**
   * storeSclangConf
   *
   * Store the original configuration path
   * so that it can be accessed by the modified Quarks methods
   * to store into the correct conf file.
   */
  async storeSclangConf(): Promise<SCLang> {
    if (this.options.sclang_conf) {
      const confPath = path.resolve(untildify(this.options.sclang_conf));
      const setConfigPath = 'SuperColliderJS.sclangConf = "' + confPath + '";\n\n';
      await this.interpret(setConfigPath, undefined, true, true, true);
    }
    return this;
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
    nowExecutingPath?: string,
    asString = false,
    postErrors = true,
    getBacktrace = true,
  ): Promise<SclangResultType> {
    return new Promise((resolve, reject): void => {
      const escaped = code
        .replace(/[\n\r]/g, "__NL__")
        .replace(/\\/g, "__SLASH__")
        .replace(/"/g, '\\"');
      const guid = cuid();

      const args = [
        '"' + guid + '"',
        '"' + escaped + '"',
        nowExecutingPath ? '"' + nowExecutingPath + '"' : "nil",
        asString ? "true" : "false",
        postErrors ? "true" : "false",
        getBacktrace ? "true" : "false",
      ].join(",");

      this.stateWatcher.registerCall(guid, { resolve, reject });
      this.write("SuperColliderJS.interpret(" + args + ");", true);
    });
  }

  /**
   * executeFile
   */
  executeFile(filename: string): Promise<any> {
    return new Promise((resolve, reject): void => {
      const guid = cuid();
      this.stateWatcher.registerCall(guid, { resolve, reject });
      this.write(`SuperColliderJS.executeFile("${guid}", "${filename}")`, true);
    });
  }

  private setState(state: State): void {
    this.stateWatcher.setState(state);
  }

  compilePaths(): string[] {
    return this.stateWatcher.result.dirs;
  }

  quit(): Promise<SCLang> {
    return new Promise((resolve): void => {
      const cleanup = (): void => {
        this.process = undefined;
        this.setState(State.NULL);
        resolve(this);
      };
      if (this.process) {
        this.process.once("exit", cleanup);
        // request a polite shutdown
        this.process.kill("SIGINT");
        setTimeout((): void => {
          // 3.6.6 doesn't fully respond to SIGINT
          // but SIGTERM causes it to crash
          if (this.process) {
            this.process.kill("SIGTERM");
            cleanup();
          }
        }, 250);
      } else {
        cleanup();
      }
    });
  }

  /**
   * @deprecated
   *
   * @static
   * @memberof SCLang
   */
  static boot = boot;
}

/**
 * Boots an sclang interpreter, resolving options and connecting.
 *
 * @memberof lang
 *
 * For values not supplied in options, it will load for config files in:
 *    - .supercollider.yaml
 *    - ~/.supercollider.yaml
 */
export async function boot(options?: SCLangArgs): Promise<SCLang> {
  const sclang = new SCLang(options);
  await sclang.boot();
  await sclang.storeSclangConf();
  return sclang;
}
