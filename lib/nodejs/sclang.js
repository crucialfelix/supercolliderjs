/* jslint node: true */

var
  _ = require('underscore'),
  events = require('events'),
  spawn = require('child_process').spawn;

var defaultOptions = {
  'cwd': '/Applications/SuperCollider/SuperCollider.app/Contents/Resources/',
  'cmd': 'sclang',
  '-u': 57120
};

/*
Usage:
   sclang [options] [file..] [-]

Options:
   -d <path>                      Set runtime directory
   -D                             Enter daemon mode (no input)
   -g <memory-growth>[km]         Set heap growth (default 256k)
   -h                             Display this message and exit
   -l <path>                      Set library configuration file
   -m <memory-space>[km]          Set initial heap size (default 2m)
   -r                             Call Main.run on startup
   -s                             Call Main.stop on shutdown
   -u <network-port-number>       Set UDP listening port (default 57120)
   -i <ide-name>                  Specify IDE name (for enabling IDE-specific class code, default "none")
   -a                             Standalone mode
*/


/**
 *
 * Local sclang - a language interpreter running on the same machine
 *
 * @param options - sclang command line options
 */
function SCLang(options) {
  this.options = _.extend(defaultOptions, options || {});
  this.process = null;
}


SCLang.super_ = events.EventEmitter;
SCLang.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: SCLang,
        enumerable: false
    }
});


/**
 * args
 *
 * private. not yet fully implemented
 *
 * @return list of non-default args
 */
SCLang.prototype.args = function() {
  var o = ['-u', this.options['-u']];
  return o;
};


/**
 * boot
 *
 * start scsynth and establish a pipe connection
 * to receive stdout and stderr
 */
SCLang.prototype.boot = function() {
  var self = this;
  console.log( this.options.cwd + this.options.cmd );
  this.process = spawn(this.options.cwd + this.options.cmd, this.args(),
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this.options.cwd
    });

  console.log('spawned ' + this.process.pid);

  this.process.on('error', function(err){
    console.log('sclang error ' + err);
    self.emit('exit', err);
  });
  this.process.on('close', function(code, signal){
    console.log('sclang closed ' + code);
    self.emit('exit', code);
  });
  this.process.on('exit', function(code, signal){
    console.log('sclang exited ' + code);
    self.emit('exit', code);
  });
  this.process.on('disconnect', function(){
    console.log('sclang disconnect ');
    self.emit('exit');
  });

  this.process.on('message', function(message) {
    console.log('sclang message ' + message);
    self.emit('message', message);
  });

  this.process.stdout.on('data', function(data){
    console.log(' ' + data);
    self.emit('out', data);
  });
  this.process.stderr.on('data', function(data){
    console.log('err! ' + data);
    self.emit('stderr', data);
  });
};


/**
 * write
 *
 * kill sclang process
 */
SCLang.prototype.write = function(chunk, callback) {
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
