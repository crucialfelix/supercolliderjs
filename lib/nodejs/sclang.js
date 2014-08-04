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
  Logger = require('./logger');

/**
 *
 * Local sclang - a language interpreter running on the same machine
 *
 * @param options - sclang command line options
 */
function SCLang(options) {
  this.options = options;
  this.process = null;
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
  if(this.options.executeFile) {
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
  var
    self = this,
    execPath = this.options.sclang;
  this.log.dbug("path:" + execPath);
  this.process = spawn(execPath, this.args(),
    {
      cwd: path.dirname(execPath)
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
  this.process.on('disconnect', function(){
    self.log.dbug('disconnect');
    self.emit('exit');
  });

  this.process.stdout.on('data', function(data) {
    self.log.stdout('' + data);
    self.emit('stdout', '' + data);
  });
  this.process.stderr.on('data', function(data) {
    self.log.stderr('' + data);
    self.emit('stderr', '' + data);
  });

  if(this.options.stdin) {
    // global top level nodejs process
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function(chunk) {
      if(chunk) {
        self.write(chunk, null, true);
      }
    });
  }
};


/**
 * write
 *
 * send a string to sclang to be interpreted
 */
SCLang.prototype.write = function(chunk, callback, noEcho) {
  if(!noEcho) {
    this.log.stdin(chunk);
  }
  this.process.stdin.write(chunk, 'UTF-8');
  // escape character means execute the currently accumulated command line as SC code
  this.process.stdin.write('\x0c', null, callback);
};


/**
 * quit
 *
 * kill sclang process
 */
SCLang.prototype.quit = function() {
  if(this.process) {
    this.process.kill('SIGTERM');
    this.process = null;
  }
};



module.exports = SCLang;
