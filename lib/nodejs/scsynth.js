/* jslint node: true */

var
  _ = require('underscore'),
  events = require('events'),
  spawn = require('child_process').spawn,
  Logger = require('./logger'),
  dgram = require('dgram'),
  osc = require('osc-min');


var defaultOptions = {
  'host': '127.0.0.1',
  'port': 57110,
  'protocol': 'udp',

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
  var
    protocol =  this.options.protocol === 'udp' ? '-u' : '-t';
     o = [protocol, this.options.port];
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
    execPath = this.options.path + '/scsynth',
    args = this.args();

  this.log.dbug(execPath + ' ' + args.join(' '));
  this.process = spawn(execPath, args,
    {
      cwd: this.options.cwd
    });
  this.log.dbug('Spawned pid: ' + this.process.pid);

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


LocalServer.prototype.connect = function() {

  var self = this;
  this.udp = dgram.createSocket('udp4');

  this.udp.on('message', function(msgbuf, rinfo) {
    var msg = osc.fromBuffer(msgbuf);
    self.log.rcvosc(msg);
    self.emit('OSC', msg);
  });

  this.udp.on('error', function(e) {
    self.log.err(e);
    self.emit('error', e);
  });
  this.udp.on('listening', function() {
    self.log.dbug('udp is listening');
  });
  this.udp.on('close', function(e) {
    self.log.dbug('udp close' + e);
    self.emit('close', e);
  });
};


LocalServer.prototype.disconnect = function() {
  if(this.udp) {
    this.udp.close();
    delete this.udp;
  }
};


LocalServer.prototype.sendMsg = function(address, args) {
  var buf = osc.toBuffer({
    address : address,
    args : args
  });
  this.log.sendosc(address + ' ' + args.join(' '));
  this.udp.send(buf, 0, buf.length, this.options.port, this.options.host);
};


module.exports = LocalServer;
