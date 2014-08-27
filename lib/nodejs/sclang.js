/* jslint node: true */

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
  join = require('path').join;

/**
 *
 * Local sclang - a language interpreter running on the same machine
 *
 * @constructor
 * @param {Object} options - sclang command line options
 */
function SCLang(options) {
  this.options = options;
  this.process = null;
  this.calls = {};
  this.state = null;
  this.log = new Logger(this.options.debug, this.options.echo);
  this.log.dbug(this.options);
}

SCLang.super_ = events.EventEmitter;
SCLang.prototype = Object.create(events.EventEmitter.prototype, {
  constructor: {
    value: SCLang,
    enumerable: false
  }
});

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
SCLang.prototype.args = function() {
  var o = [];
  if (this.options.executeFile) {
    o.push(this.options.executeFile);
  }
  o.push('-u', this.options.langPort);
  return o;
};

/**
 * boot
 *
 * start sclang and establish a pipe connection
 * to receive stdout and stderr
 */
SCLang.prototype.boot = function() {
  var
    deferred = Q.defer(),
    execPath = this.options.sclang,
    self = this;
  this.log.dbug('path:' + execPath);
  this.setState('booting');
  this.process = spawn(execPath, this.args(),
    {
      cwd: path.dirname(execPath)
    });

  function resolver(state) {
    if (state === 'ready') {
      deferred.resolve();
      self.removeListener('state', resolver);
    } else if (state === 'compileError') {
      deferred.reject(self.compileErrors);
      self.removeListener('state', resolver);
    }
  }
  // temporary listener till booted
  this.addListener('state', resolver);

  // long term listeners
  this.installListeners();
  return deferred.promise;
};

/**
  * installListeners
  */
SCLang.prototype.installListeners = function() {

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
            var parsed = this.parseCompileErrors(this.parseErrors.join('\n'));
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
          // it sometimes posts this sc3> even when compile failed
          re: /^[\s]*sc3>[\s]*$/m,
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
          re: /^Welcome to SuperCollider ([0-9a-zA-Z\.]+)\. /m,
          fn: function(match) {
            self.version = match[1];
            self.setState('ready');
          }
        }
      ],
      ready: [
        {
          // callback
          re: /^SUPERCOLLIDERJS\:([0-9a-f\-]+)\:([A-Za-z]+)\:(.+)$/m,
          fn: function(match, text) {
            var
              guid = match[1],
              type = match[2],
              json = match[3],
              obj = JSON.parse(json),
              stdout;
            if (guid in self.calls) {
              if (type === 'Result') {
                self.calls[guid].resolve(obj);
              } else {
                if (!obj) {
                  obj = {};
                }
                stdout = text.replace(/^SUPERCOLLIDERJS[\s\S]+/mg, '');
                obj.stdout = stdout;
                if (type === 'SyntaxError') {
                  obj.syntaxErrors = self.parseSyntaxErrors(stdout);
                }
                self.calls[guid].reject({type: type, error: obj});
              }
              delete self.calls[guid];
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
        // {
        //   // interpret calls post this
        //   re: /^SUPERCOLLIDERJS.interpreted$/m,
        //   fn: function(match, text) {
        //     // chunk may contain errors
        //     // to capture
        //     // and reject this:
        //     // self.calls[guid].reject({type: type, error: obj});
        //
        //     // capture potential syntax errors
        //     // supress output
        //     // return true;
        //   }
        // }
      ]
    };

  this.process.stdout.on('data', function(data) {
    var text = '' + data,
        passthru = true;
    states[self.state].forEach(function(stf) {
      var match = stf.re.exec(text);
      if (match) {
        // do not post if handler returns true
        if (stf.fn(match, text) === true) {
          passthru = false;
        }
      }
    });
    if (passthru) {
      self.log.stdout(text);
      self.emit('stdout', text);
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
};

/**
 * write
 *
 * send a raw string to sclang to be interpreted
 * callback is called after write is complete
 */
SCLang.prototype.write = function(chunk, callback, noEcho) {
  if (!noEcho) {
    this.log.stdin(chunk);
  }
  this.process.stdin.write(chunk, 'UTF-8');
  // escape character means execute the currently accumulated command line as SC code
  this.process.stdin.write('\x0c', null, callback);
};

/**
  * initInterpreter
  *
  * make sclang execute the interpret.scd file
  * to load the functions used by interpret
  */
SCLang.prototype.initInterpreter = function() {
  var path = join(__dirname, '../sc/interpret.scd'),
      deferred = Q.defer(),
      self = this;
  this.once('interpreterLoaded', function() {
    deferred.resolve(self);
  });
  this.write('thisProcess.interpreter.executeFile("' + path + '");\n',
    null, true);
  return deferred.promise;
};

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
 *        rather than as a full JSON object
 * @param {Boolean} postErrors
 *        call error.reportError on any errors
 *        which posts call stack, receiver, args, etc
 * @param {Boolean} getBacktrace
 *        return full backtrace
 * @returns {Promise}
 */
SCLang.prototype.interpret =
  function(code, nowExecutingPath, asString, postErrors, getBacktrace) {
    var deferred = Q.defer(),
        escaped = code.replace(/[\n\r]/g, '__NL__').replace(/\"/g, '\\"'),
        scstring = '"' + escaped + '"',
        guid = uuid.v1(),
        guidString = '"' + guid + '"',
        nep = nowExecutingPath ? '"' + nowExecutingPath + '"' : 'nil',
        rras = asString ? 'true' : 'false',
        pe = postErrors ? 'true' : 'false',
        bt = getBacktrace ? 'true' : 'false',
        args = [guidString, scstring, nep, rras, pe, bt].join(','),
        scode;

    scode = 'Library.at(\\supercolliderjs, \\interpret).value(' + args +
      ');"SUPERCOLLIDERJS.interpreted".postln;\n';

    // register listener
    this.calls[guid] = deferred;
    this.write(scode, null, true);
    return deferred.promise;
  };

/**
  * parse syntax error from STDOUT runtime errors
  */
SCLang.prototype.parseSyntaxErrors = function(text) {
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
};

/**
  * parse library compile errors error from STDOUT
  */
SCLang.prototype.parseCompileErrors = function(text) {
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
};

SCLang.prototype.finalizeCompileErrors = function() {
  this.compileErrors =
    this.parseCompileErrors(this.parseErrors.join('\n'));
  this.parseErrors = [];
  this.setState('compileError');
};

/**
  * setState
  * set state to one of null, 'booting' 'compiling' 'compileError' 'compiled' 'ready'
  * and emit
  */
SCLang.prototype.setState = function(state) {
  if (state !== this.state) {
    this.state = state;
    this.emit('state', state);
    this.log.dbug('state: ' + state);
  }
};

/**
 * quit
 *
 * stop the sclang process
 */
SCLang.prototype.quit = function() {
  var deferred = Q.defer();
  if (this.process) {
    this.process.once('exit', function() {
      deferred.resolve();
    });
    // should do shutdown first
    this.process.kill('SIGINT');
    this.process = null;
  } else {
    deferred.resolve();
  }
  this.setState(null);
  return deferred.promise;
};

/**
  * alternate constructor
  * resolves options, boots and loads interpreter
  * @returns: a promise
  */
SCLang.boot = function(options) {
  var resolveOptions = require('./resolveOptions'),
      deferred = Q.defer();

  resolveOptions(null, options).then(function(options) {
    var sclang = new SCLang(options);

    sclang.boot()
      .then(function() {
        return sclang.initInterpreter();
      })
      .then(function() {
        deferred.resolve(sclang);
      })
      .catch(deferred.reject);

  });

  return deferred.promise;
};

module.exports = SCLang;
