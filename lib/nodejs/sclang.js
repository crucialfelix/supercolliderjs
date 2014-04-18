/* jslint node: true */

var
  _ = require('underscore'),
  events = require('events'),
  spawn = require('child_process').spawn,
  colors = require('colors');


var defaultOptions = {
  'cwd': '/Applications/SuperCollider/SuperCollider.app/Contents/Resources/',
  'cmd': 'sclang',
  'debug': true,
  'echo': true,
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
  this.process = spawn(this.options.cwd + this.options.cmd, this.args(),
    {
      cwd: this.options.cwd
    });

  this.process.on('error', function(err) {
    self.log('ERROR:' + err, 'error');
    self.emit('exit', err);
  });
  this.process.on('close', function(code, signal) {
    self.log('close ' + code + signal, 'debug');
    self.emit('exit', code);
  });
  this.process.on('exit', function(code, signal) {
    self.log('exit ' + code + signal, 'debug');
    self.emit('exit', code);
  });
  this.process.on('disconnect', function(){
    self.log('disconnect', 'debug');
    self.emit('exit');
  });

  this.process.stdout.on('data', function(data) {
    self.log('' + data, 'stdout');
    self.emit('stdout', '' + data);
  });
  this.process.stderr.on('data', function(data) {
    self.log('' + data, 'stderr');
    self.emit('stderr', '' + data);
  });
};


/**
 * write
 *
 * kill sclang process
 */
SCLang.prototype.write = function(chunk, callback) {
  this.log(chunk, 'stdin');
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



/**
 * log
 */
SCLang.prototype.log = function(text, style) {
  if(this.options.debug) {
    if(style === 'debug') {
      console.log(text.debug);
      return;
    }
    if(style === 'error') {
      console.log(text.error);
      return;
    }
  }
  if(this.options.echo) {
    if(style === 'command') {
      console.log(text.command);
      return;
    }
    if(style === 'stdin') {
      console.log(text.stdin);
      return;
    }
    if(style === 'stdout') {
      console.log(text.stdout);
      return;
    }
    if(style === 'stderr') {
      console.log(text.stderr);
      return;
    }
  }
};


colors.setTheme({
  debug: 'blue',
  error: 'magenta',
  stdout: 'green',
  stderr: 'red',
  stdin: 'cyan'
});


module.exports = SCLang;
