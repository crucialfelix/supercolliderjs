
/**
 *
 * sclang - boots a supercollider language interpreter process
 *  and enables stdin/out and system level event responders
 *
 *  SuperCollider comes with an executable called sclang
 *  which can be communicated with via stdin/stdout
 *  or via OSC.
 *
 * methods:
 *   boot  - boot an sclang process
 *   write - write to stdin of the sclang process
 *   quit
 *
 */

var
  _ = require('underscore'),
  events = require('events'),
  spawn = require('child_process').spawn,
  path = require('path'),
  Logger = require('./logger'),
  Q = require('q'),
  uuid = require('node-uuid'),
  join = require('path').join,
  yaml = require('js-yaml'),
  temp = require('temp'),
  fs   = require('fs'),
  untildify = require('untildify');


class SCLang extends events.EventEmitter {

  /*
   * @param {object} options - sclang command line options
   */
  constructor(options) {
    super();
    this.options = options || {};
    this.process = null;
    this.calls = {};
    this.responseCollectors = {};
    this.capturing = {};
    this.state = null;
    this.log = new Logger(this.options.debug, this.options.echo);
    this.log.dbug(this.options);
  }

  /**
   * build args for sclang
   *
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
   */
  args(options) {
    var o = [];
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
   * @param {object} options - options to write to file
   * @returns {Promise} resolving with the path of the temp config file
   */
  makeSclangConfig(config) {
    /**
      write options as yaml to a temp file
      and return the path
    **/
    var addPath, includePaths, str;
    var deferred = Q.defer();

    str = yaml.safeDump(config, {indent: 4});
    temp.open('sclang-config', function(err, info) {
      if(err) {
        return deferred.reject(err);
      }
      fs.write(info.fd, str);
      fs.close(info.fd, function(err) {
        if(err) {
          return deferred.reject(err);
        }
        deferred.resolve(info.path);
      });
    });

    return deferred.promise;
  }


  /**
   * boot
   *
   * start sclang as a subprocess
   *
   * @returns {Promise}
   */
  boot() {
    var self = this;
    this.setState('booting');

    // merge supercollider.js options with any sclang_conf
    var config = this.sclangConfigOptions(this.options);

    if(config.includePaths || config.excludePaths) {
      return this.makeSclangConfig(config)
        .then(function(configPath) {
          return self.spawnProcess(self.options.sclang, _.extend({}, self.options, {config: configPath}));
        });
    } else {
      return self.spawnProcess(self.options.sclang, _.extend({}, self.options));
    }
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
  spawnProcess(execPath, commandLineOptions) {
    var self = this;
    var deferred = Q.defer();

    this.process = spawn(execPath, this.args(commandLineOptions),
      {
        cwd: path.dirname(execPath)
      });

    function bootListener(state) {
      if (state === 'ready') {
        deferred.resolve();
        self.removeListener('state', bootListener);
      } else if (state === 'compileError') {
        deferred.reject(self.compileErrors);
        self.removeListener('state', bootListener);
        // probably should remove all listeners
      }
    }

    // temporary listener until booted ready or compileError
    // that removes itself
    this.addListener('state', bootListener);

    // long term listeners
    this.installListeners();

    return deferred.promise;
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
  sclangConfigOptions(options) {
    var
      runtimeIncludePaths,
      sclang_conf = {},
      config = {};

    // add sc-classes to sclang's compile paths
    if(options.errorsAsJSON) {
      runtimeIncludePaths = [path.resolve(__dirname, '../sc-classes')];
    }

    if(options.sclang_conf) {
      try {
        sclang_conf = yaml.safeLoad(fs.readFileSync(untildify(options.sclang_conf), 'utf8'));
      } catch (e) {
        this.log.err(e);
        throw 'Cannot open or read specified sclang_conf ' + options.sclang_conf;
      }
    }

    return {
      includePaths: _.union(sclang_conf.includePaths, options.includePaths, runtimeIncludePaths),
      excludePaths: _.union(sclang_conf.excludePaths, options.excludePaths),
      postInlineWarning: _.isUndefined(options.postInlineWarnings) ? sclang_conf.postInlineWarnings : options.postInlineWarnings
    };
  }

  /**
    * installListeners
    *
    * These parse the stdout and stderr of sclang
    * and detect changes of the interpreter state
    */
  installListeners() {

    var self = this,
      states = {
        booting: [
          {
            re: /^compiling class library/m,
            fn: function(match, text) {
              self.setState('compiling');
              self.parseErrors = [text];
            }
          }
        ],
        compiling: [
          {
            re: /^compile done/m,
            fn: function() {
              var parsed = self.parseCompileErrors(self.parseErrors.join('\n'));
              self.compiledDirs = parsed.dirs;
              self.setState('compiled');
              delete self.parseErrors;
            }
          },
          {
            re: /^Library has not been compiled successfully/m,
            fn: function(match, text) {
              self.parseErrors.push(text);
              self.finalizeCompileErrors();
              self.setState('compileError');
            }
          },
          {
            // it may go directly into initClasses without posting compile done
            re: /Welcome to SuperCollider ([0-9a-zA-Z\.]+)\. /m,
            fn: function(match) {
              self.version = match[1];
              var parsed = self.parseCompileErrors(self.parseErrors.join('\n'));
              self.compiledDirs = parsed.dirs;
              delete self.parseErrors;
              self.setState('ready');
            }
          },
          {
            // it sometimes posts this sc3> even when compile failed
            re: /^[\s]*sc3>[\s]*$/m,
            fn: function(match, text) {
              self.parseErrors.push(text);
              self.finalizeCompileErrors();
            }
          },
          {
            // another case of just trailing off
            re: /^error parsing/m,
            fn: function(match, text) {
              self.parseErrors.push(text);
              self.finalizeCompileErrors();
            }
          },
          {
            // collect all output
            re: /(.+)/m,
            fn: function(match, text) {
              self.parseErrors.push(text);
            }
          },
        ],
        compileError: [
        ],
        compiled: [
          {
            re: /Welcome to SuperCollider ([0-9a-zA-Z\.]+)\. /m,
            fn: function(match) {
              self.version = match[1];
              self.setState('ready');
            }
          }
        ],
        ready: [
          {
            re: /^SUPERCOLLIDERJS\:([0-9a-f\-]+)\:([A-Za-z]+)\:(.*)$/mg,
            fn : function(match, text) {
              var
                guid = match[1],
                type = match[2],
                body = match[3],
                response,
                stdout,
                obj,
                lines,
                started=false,
                stopped=false;

              if(type === 'CAPTURE') {
                if(body === 'START') {
                  self.capturing[guid] = [];
                }
                if(body === 'START') {
                  lines = [];
                  // yuck
                  _.each(text.split('\n'), function(l) {
                    if(l.match(/SUPERCOLLIDERJS\:([0-9a-f\-]+)\:CAPTURE:START/)) {
                      started = true;
                    } else if(l.match(/SUPERCOLLIDERJS\:([0-9a-f\-]+)\:CAPTURE:END/)) {
                      stopped = true;
                    } else {
                      if(started && (!stopped)) {
                        lines.push(l);
                      }
                    }
                  });
                  self.capturing[guid].push(lines.join('\n'));
                }
                return true;
              }
              if(type === 'START') {
                self.responseCollectors[guid] = {
                  type: body,
                  chunks: []
                };
                return true;
              }
              if(type === 'CHUNK') {
                self.responseCollectors[guid].chunks.push(body);
                return true;
              }
              if(type === 'END') {
                response = self.responseCollectors[guid];
                stdout = response.chunks.join('');
                obj = JSON.parse(stdout);

                if (guid in self.calls) {
                  if (response.type === 'Result') {
                    self.calls[guid].resolve(obj);
                  } else {
                    if (response.type === 'SyntaxError') {
                      stdout = self.capturing[guid].join('\n');
                      obj = self.parseSyntaxErrors(stdout);
                      delete self.capturing[guid];
                    }
                    self.calls[guid].reject({type: response.type, error: obj});
                  }
                  delete self.calls[guid];
                } else {
                  // I hope sc doesn't post multiple streams at the same time
                  if(guid === "0") {
                    // out of band error
                    self.emit('error', {type: response.type, error: obj});
                  }
                }
                delete self.responseCollectors[guid];
                return true;
              }
            }
          },
          {
            // interpreter.scd posts this at the end
            re: /^SUPERCOLLIDERJS-interpreter-loaded$/m,
            fn: function() {
              self.emit('interpreterLoaded');
              return true;
            }
          }
        ]
      };

    this.process.stdout.on('data', function(data) {
      var text = '' + data,
          passthru = true,
          startState = self.state;
      states[self.state].forEach(function(stf) {
        var match;
        if(self.state === startState) {
          while((match = stf.re.exec(text)) !== null) {
            // do not post if any handler returns true
            if (stf.fn(match, text) === true) {
              passthru = false;
            }
            // break if its not a /g regex with multiple results
            if(!stf.re.global) {
              break;
            }
          }
        }
      });

      if (passthru) {
        self.log.stdout(text);
        self.emit('stdout', text);
      } else {
        self.log.dbug(text);
      }
    });

    this.process.on('error', function(err) {
      self.log.err('ERROR:' + err, 'error');
      self.emit('stderr', err);
    });
    this.process.on('close', function(code, signal) {
      self.log.dbug('close ' + code + signal);
      self.emit('exit', code);
      self.setState(null);
    });
    this.process.on('exit', function(code, signal) {
      self.log.dbug('exit ' + code + signal);
      self.emit('exit', code);
      self.setState(null);
    });
    this.process.on('disconnect', function() {
      self.log.dbug('disconnect');
      self.emit('exit');
      self.setState(null);
    });

    this.process.stderr.on('data', function(data) {
      self.log.stderr('' + data);
      self.emit('stderr', '' + data);
    });

    if (this.options.stdin) {
      // global top level nodejs process
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', function(chunk) {
        if (chunk) {
          self.write(chunk, null, true);
        }
      });
    }
  }

  /**
   * write
   *
   * send a raw string to sclang to be interpreted
   * callback is called after write is complete
   */
  write(chunk, callback, noEcho) {
    if (!noEcho) {
      this.log.stdin(chunk);
    }
    this.process.stdin.write(chunk, 'UTF-8');
    // escape character means execute the currently accumulated command line as SC code
    this.process.stdin.write('\x0c', null, callback);
  }

  /**
    * initInterpreter
    *
    * make sclang execute the interpret.scd file
    * to load the functions used by interpret
    */
  initInterpreter() {
    var scriptPath = join(__dirname, '../sc/interpret.scd'),
        deferred = Q.defer(),
        self = this;

    // after the interpreter finishes processing the script this will be triggered
    this.once('interpreterLoaded', function() {
      // store the original configuration path into Library.at('supercolliderjs', 'sclang_conf')
      // so that it can be accessed by Quarks
      if (self.options.sclang_conf) {
        var configPath = path.resolve(untildify(self.options.sclang_conf));
        var setConfigPath = 'Library.put(\'supercolliderjs\', \'sclang_conf\', "' + configPath + '");';
        self.interpret(setConfigPath, null, true, false, false).then(function() {
          deferred.resolve(self);
        }, deferred.reject);
      }
    });

    // load the json interpreter bridge
    this.write('thisProcess.interpreter.executeFile("' + scriptPath + '");\n', null, true);
    return deferred.promise;
  }

  /**
   * interpret
   *
   * evaluates code in sclang
   * and returns a promise
   *
   * resolves promise with result or rejects with error as JSON
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
   * @returns {Promise}
   */
  interpret(code, nowExecutingPath, asString, postErrors, getBacktrace) {
    var deferred = Q.defer(),
        escaped = code.replace(/[\n\r]/g, '__NL__').replace(/\\/g, '__SLASH__').replace(/\"/g, '\\"'),
        scstring = '"' + escaped + '"',
        guid = uuid.v1(),
        guidString = '"' + guid + '"',
        nep = nowExecutingPath ? '"' + nowExecutingPath + '"' : 'nil',
        rras = asString ? 'true' : 'false',
        pe = postErrors ? 'true' : 'false',
        bt = getBacktrace ? 'true' : 'false',
        args = [guidString, scstring, nep, rras, pe, bt].join(','),
        scode;

    scode = 'Library.at(\\supercolliderjs, \\interpret).value(' + args + ');"SUPERCOLLIDERJS.interpreted".postln;\n';

    // register listener
    this.calls[guid] = deferred;
    this.write(scode, null, true);
    return deferred.promise;
  }

  /**
    * parse syntax error from STDOUT runtime errors
    */
  parseSyntaxErrors(text) {
    var
        msgRe = /^ERROR: syntax error, (.+)$/m,
        fileRe = /in file '(.+)'/m,
        lineRe = /line ([0-9]+) char ([0-9]+):$/m;

    var msg = msgRe.exec(text),
        line = lineRe.exec(text),
        file = fileRe.exec(text),
        code = text.split('\n').slice(4, -3).join('\n').trim();
    return {
      msg: msg && msg[1],
      file: file && file[1],
      line: line && parseInt(line[1], 10),
      charPos: line && parseInt(line[2], 10),
      code: code
    };
  }

  /**
    * parse library compile errors error from STDOUT
    */
  parseCompileErrors(text) {
    var errors = {
      stdout: text,
      errors: [],
      extensionErrors: [],
      dirs: []
    };

    // NumPrimitives = 688
    // multiple:
    // compiling dir: ''
    var dirsRe = /^[\s]+compiling dir\:[\s]+'(.+)'$/mg,
        match,
        end = 0;

    while (match = dirsRe.exec(text)) {
      errors.dirs.push(match[1]);
      end = match.index + match[0].length;
    }

    // the rest are the error blocks
    var rest = text.substr(end),
        // split on ---------------------
        blocks = rest.split(/^\-+$/m),
        // message
        // in file 'path' line x char y:
        errRe = /([^\n]+)\n\s+in file '([^']+)'\n\s+line ([0-9]+) char ([0-9]+)/mg,
        nonExistentRe = /ERROR: Class extension for nonexistent class '([A-Za-z0-9\_]+)[\s\S]+In file:'(.+)'/mg,
        commonPath = /^\/Common/;

    while (match = errRe.exec(rest)) {
      var file = match[2];
      // errors in Common library are posted as '/Common/...'
      if(commonPath.exec(file)) {
        file = errors.dirs[0] + file;
      }
      errors.errors.push({
        msg: match[1],
        file: file,
        line: parseInt(match[3], 10),
        char: parseInt(match[4], 10)
      });
    }

    while (match = nonExistentRe.exec(text)) {
      errors.extensionErrors.push({
        forClass: match[1],
        file: match[2]
      });
    }

    return errors;
  }

  finalizeCompileErrors() {
    this.compileErrors =
      this.parseCompileErrors(this.parseErrors.join('\n'));
    this.parseErrors = [];
    this.compileDirs = this.compileErrors.dirs;
    this.setState('compileError');
  }

  /**
    * setState
    * set state to one of null, 'booting' 'compiling' 'compileError' 'compiled' 'ready'
    * and emit
    */
  setState(state) {
    if (state !== this.state) {
      this.state = state;
      this.emit('state', state);
      this.log.dbug('state: ' + state);
    }
  }

  /**
   * quit
   *
   * stop the sclang process
   */
  quit() {
    var deferred = Q.defer(),
        self = this;
    if (this.process) {
      this.process.once('exit', function() {
        self.process = null;
        self.setState(null);
        deferred.resolve();
      });
      // request a polite shutdown
      this.process.kill('SIGINT');
      setTimeout(function() {
        // 3.6.6 doesn't fully respond to SIGINT
        // but SIGTERM causes it to crash
        if(self.process) {
          self.process.kill('SIGTERM');
        }
      }, 250);
    } else {
      this.setState(null);
      deferred.resolve();
    }
    return deferred.promise;
  }
}


/**
  * alternate constructor
  * resolves options, boots and loads interpreter
  *
  * remember to add a .fail handler to the returned
  * Promise so that you catch any propagated errors
  *
  * @param {object} sclang options
  * @returns: {Promise}
  */
SCLang.boot = function(options) {
  var resolveOptions = require('./resolveOptions');

  return resolveOptions(options.config, options).then(function(options) {

    var sclang = new SCLang(options);

    return sclang.boot()
      .then(function() {
        return sclang.initInterpreter();
      });
  });

};


module.exports = SCLang;
