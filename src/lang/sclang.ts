import { ChildProcess, spawn } from "child_process";
import cuid from "cuid";
import { EventEmitter } from "events";
import fs from "fs";
import yaml from "js-yaml";
import _ from "lodash";
import path from "path";
import temp from "temp";
import untildify from "untildify";

import { SCError } from "../Errors";
import { JSONType } from "../Types";
import Logger from "../utils/logger";
import { SclangCompileResult, SclangIO, State } from "./internals/sclang-io";

export type SclangResultType = JSONType;

interface SCLangOptions {
  debug: boolean;
  echo: boolean;
  log?: Console;
  // path to sclang executable
  sclang: string;
  // path to existing conf file
  sclang_conf?: string;

  stdin: boolean;
  failIfSclangConfIsMissing: boolean;
  conf: SCLangConf;
}

// import resolveOptions from "../utils/resolveOptions";
/**
 * These were at the options root. Moving them to .conf
 */
interface BackwardCompatArgs {
  includePaths?: string[];
  excludePaths?: string[];
  postInlineWarnings?: boolean;
}
export type SCLangArgs = Partial<SCLangOptions> & BackwardCompatArgs;

const defaults: SCLangOptions = {
  debug: false,
  echo: true,
  // TODO resolve executable
  sclang: "sclang",
  failIfSclangConfIsMissing: false,
  stdin: false,
  conf: {
    includePaths: [],
    excludePaths: [],
    postInlineWarnings: false,
  },
};

/**
 * sclang_conf.yaml format
 */
interface SCLangConf {
  includePaths: string[];
  excludePaths: string[];
  postInlineWarnings: boolean;
}

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
    this.options = _.defaults(options, defaults);

    // bwd compat
    if (options) {
      // Move these from root of options into .conf
      let deprec = ["includePaths", "excludePaths", "postInlineWarnings"];
      this.options.conf = _.defaults(_.pick(options, deprec), this.options.conf);
      for (const d of deprec) {
        delete this.options[d];
      }
    }

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
    let o: string[] = [];
    o.push("-i", "supercolliderjs");
    if (options.executeFile) {
      o.push(options.executeFile);
    }
    o.push("-u", String(options.langPort));
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
    let str = yaml.safeDump(conf, { indent: 4 });
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

  isReady() {
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
      var done = false;

      this.process = this._spawnProcess(execPath, this.args(commandLineOptions));
      if (!(this.process && this.process.pid)) {
        reject(new Error(`Failed to spawn process: ${execPath}`));
        return;
      }

      var bootListener = (state: State) => {
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
          this.log.err("Timeout waiting for sclang to boot");
          // force it to finalize
          this.stateWatcher.processOutput();
          // bootListener above will reject the promise
          this.stateWatcher.setState(State.COMPILE_ERROR);
          this.removeListener("state", bootListener);
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
    let runtimeIncludePaths = [path.resolve(__dirname, "../../lib/supercollider-js")];
    let defaultConf: SCLangConf = {
      postInlineWarnings: false,
      includePaths: [],
      excludePaths: [],
    };
    let sclang_conf = defaultConf;

    if (options.sclang_conf) {
      try {
        sclang_conf = yaml.safeLoad(fs.readFileSync(untildify(options.sclang_conf), "utf8"));
      } catch (e) {
        // By default allow a missing sclang_conf file
        // so that the language can create it on demand if you use Quarks or LanguageConfig.
        if (!options.failIfSclangConfIsMissing) {
          // Was the sclang_conf just in the defaults or was it explicitly set ?
          this.log.dbug(e);
          sclang_conf = defaultConf;
        } else {
          throw new Error("Cannot open or read specified sclang_conf " + options.sclang_conf);
        }
      }
    }

    return {
      includePaths: _.union(sclang_conf.includePaths, options.conf.includePaths, runtimeIncludePaths),
      excludePaths: _.union(sclang_conf.excludePaths, options.conf.excludePaths),
      postInlineWarnings: _.isUndefined(options.conf.postInlineWarnings)
        ? sclang_conf.postInlineWarnings
        : Boolean(options.conf.postInlineWarnings),
    };
  }

  makeStateWatcher(): SclangIO {
    let stateWatcher = new SclangIO();
    for (let name of ["interpreterLoaded", "error", "stdout", "state"]) {
      stateWatcher.on(name, (...args) => {
        this.emit(name, ...args);
      });
    }
    return stateWatcher;
  }

  /**
   * listen to events from process and pipe stdio to the stateWatcher
   */
  installListeners(subprocess: ChildProcess, listenToStdin: boolean = false) {
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
        var ds = String(data);
        this.log.dbug(ds);
        this.stateWatcher.parse(ds);
      });
    }
    if (subprocess.stderr) {
      subprocess.stderr.on("data", data => {
        var error = String(data);
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
  write(chunk: string, noEcho: boolean) {
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
      var confPath = path.resolve(untildify(this.options.sclang_conf));
      var setConfigPath = 'SuperColliderJS.sclangConf = "' + confPath + '";\n\n';
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
    asString: boolean = false,
    postErrors: boolean = true,
    getBacktrace: boolean = true,
  ): Promise<SclangResultType> {
    return new Promise((resolve, reject) => {
      var escaped = code
        .replace(/[\n\r]/g, "__NL__")
        .replace(/\\/g, "__SLASH__")
        .replace(/"/g, '\\"');
      var guid = cuid();

      var args = [
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
  executeFile(filename: string) {
    return new Promise((resolve, reject) => {
      var guid = cuid();
      this.stateWatcher.registerCall(guid, { resolve, reject });
      this.write(`SuperColliderJS.executeFile("${guid}", "${filename}")`, true);
    });
  }

  private setState(state: State) {
    this.stateWatcher.setState(state);
  }

  compilePaths(): string[] {
    return this.stateWatcher.result.dirs;
  }

  quit(): Promise<SCLang> {
    return new Promise(resolve => {
      var cleanup = () => {
        this.process = undefined;
        this.setState(State.NULL);
        resolve(this);
      };
      if (this.process) {
        this.process.once("exit", cleanup);
        // request a polite shutdown
        this.process.kill("SIGINT");
        setTimeout(() => {
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
 * commandLineOptions.config - Explicit path to a yaml config file
 * If undefined then it will look for config files in:
 *    - .supercollider.yaml
 *    - ~/.supercollider.yaml
 */
export async function boot(options?: SCLangArgs): Promise<SCLang> {
  let opts = _.defaults(options, defaults);

  // TODO this looks for a .supercollider.yaml file
  // but it's designed for Server
  // you just want to load a default config from the file
  // and it should be done by the SCLang, not here
  // return resolveOptions(opts.sclang_conf, opts).then(resolvedOptions => {
  //   var sclang = new SCLang(resolvedOptions);
  //   return sclang.boot().then(() => {
  //     return sclang.storeSclangConf().then(() => sclang);
  //   });
  // });
  const sclang = new SCLang(opts);
  await sclang.boot();
  await sclang.storeSclangConf();
  return sclang;
}
