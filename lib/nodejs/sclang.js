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
 * @param {dict} options - sclang command line options
 */
function SCLang(options) {
  this.options = options;
  this.process = null;
  this.calls = {};
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
 * start scsynth and establish a pipe connection
 * to receive stdout and stderr
 */
SCLang.prototype.boot = function() {
  var execPath = this.options.sclang;
  this.log.dbug('path:' + execPath);
  this.process = spawn(execPath, this.args(),
    {
      cwd: path.dirname(execPath)
    });

  this.installListeners();
};

/**
  * installListeners
  */
SCLang.prototype.installListeners = function() {

  var self = this;

  function matchedListener(guid, type, json) {
    var obj = JSON.parse(json);
    if (guid in self.calls) {
      if (type === 'Result') {
        self.calls[guid].resolve(obj);
      } else {
        self.calls[guid].reject({type: type, error: obj});
      }
      delete self.calls[guid];
    }
  }

  this.process.stdout.on('data', function(data) {
    var text = '' + data;
    // compiling class library...  - start compile
    // compile done - start init
    // Welcome to SuperCollider - end init
    // ERROR:
    var re = /^SUPERCOLLIDERJS\:([0-9a-f\-]+)\:([A-Za-z]+)\:(.+)$/m;
    var match = re.exec(text);
    if (match) {
      matchedListener(match[1], match[2], match[3]);
    } else {
      self.log.stdout(text);
      self.emit('stdout', text);
    }
  });

  this.process.on('error', function(err) {
    self.log.err('ERROR:' + err, 'error');
    self.emit('exit', err);
  });
  this.process.on('close', function(code, signal) {
    self.log.dbug('close ' + code + signal);
    self.emit('exit', code);
  });
  this.process.on('exit', function(code, signal) {
    self.log.dbug('exit ' + code + signal);
    self.emit('exit', code);
  });
  this.process.on('disconnect', function() {
    self.log.dbug('disconnect');
    self.emit('exit');
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
SCLang.prototype.initInterpreter = function(callback) {
  var path = join(__dirname, '../sc/interpret.scd');
  this.write('thisProcess.interpreter.executeFile("' + path + '")',
    callback, true);
};

/**
 * interpret
 *
 * evaluates code in sclang
 * and returns a promise
 *
 * resolves promise with result or rejects with error as JSON
 *
 * @param {string} code
 *        source code to evaluate
 * @param {string} nowExecutingPath
          set thisProcess.nowExecutingPath
 *        for use in a REPL to evaluate text in a file
 *        and let sclang know what file it is executing.
 * @param {Boolean} asString
 *        return result .asString for post window
 *        rather than as a full JSON object
 * @returns {Promise}
 */
SCLang.prototype.interpret = function(code, nowExecutingPath, asString) {
  // inject interpret.scd
  // escape code
  // make guid
  // construct code call
  // watch process stdout
  // on error or success translate into responses
  // resolve promise
  // unwatch process stdout
  var deferred = Q.defer(),
      escaped = code.replace(/[\n\r]/g, '__NL__').replace(/\"/g, '\\"'),
      scstring = '"' + escaped + '"',
      guid = uuid.v1(),
      guidString = '"' + guid + '"',
      nep = nowExecutingPath ? '"' + nowExecutingPath + '"' : 'nil',
      rras = asString ? 'true' : 'false',
      args = [guidString, scstring, nep, rras].join(','),
      scode;

  scode = 'Library.at(\\supercolliderjs, \\interpret).value(' + args +
    ');"SUPERCOLLIDERJS.interpreted".postln;';

  // register listener
  this.calls[guid] = deferred;
  this.write(scode, null, true);
  return deferred.promise;
};

/**
 * quit
 *
 * kill sclang process
 */
SCLang.prototype.quit = function() {
  if (this.process) {
    // should do shutdown first
    this.process.kill('SIGTERM');
    this.process = null;
  }
};

module.exports = SCLang;
