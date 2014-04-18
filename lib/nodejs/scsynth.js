/* jslint node: true */

var
  _ = require('underscore'),
  events = require('events'),
  spawn = require('child_process').spawn,
  Logger = require('./logger');


var defaultOptions = {
  'ip': '127.0.0.1',
  'port': 57110,
  'protocol': 'tcp',

  'path': '/Applications/SuperCollider/SuperCollider.app/Contents/Resources/',
  'echo': true,
  'debug': true
};


/**
 *
 * Local Server - a server running on the same machine
 *
 * @param options - server command line options
 */
function LocalServer(options) {
  this.options = _.extend(defaultOptions, options ? options : {});
  this.process = null;
  this.log = new Logger(this.options.debug, this.options.echo);
}


LocalServer.super_ = events.EventEmitter;
LocalServer.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: LocalServer,
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
LocalServer.prototype.args = function() {
  var o = ['-t', this.options.port];
  return o;
};


/**
 * boot
 *
 * start scsynth and establish a pipe connection
 * to receive stdout and stderr
 */
LocalServer.prototype.boot = function() {
  var
    self = this,
    execPath = this.options.path + '/scsynth';
  this.log.dbug(execPath);
  this.process = spawn(execPath, this.args(),
    {
      cwd: this.options.cwd
    });

  this.log.dbug('spawned ' + this.process.pid);

  this.process.on('error', function(err){
    self.log.err('Server error ' + err);
    self.emit('exit', err);
  });
  this.process.on('close', function(code, signal) {
    self.log.dbug('Server closed ' + code);
    self.emit('exit', code);
  });
  this.process.on('exit', function(code, signal) {
    self.log.dbug('Server exited ' + code);
    self.emit('exit', code);
  });

  this.process.stdout.on('data', function(data) {
    self.log.stdout(' ' + data);
    self.emit('out', data);
  });
  this.process.stderr.on('data', function(data) {
    self.log.stderr('err! ' + data);
    self.emit('error', data);
  });
};


/**
 * quit
 *
 * kill scsynth process
 */
LocalServer.prototype.quit = function() {
  if(this.process) {
    this.process.kill('SIGTERM');
    this.process = null;
  }
};


module.exports = LocalServer;
