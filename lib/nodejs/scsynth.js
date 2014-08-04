/* jslint node: true */


/**
 *
 * scsynth - boots a supercollider synthesis server process
 *
 *  SuperCollider comes with an executable called scsynth
 *  which can be communicated with via udp OSC
 *
 *  The primary way to send messages in with sendMsg
 *  eg. server.sendMsg('/s_new', ['defName', 440])

 *  and the responses are emitted as 'OSC'
 *  eg. server.on('OSC', function(msg) {  ...  });
 *
 * methods:
 *   boot        - boot an scsynth process
 *   quit
 *   connect     - connect via udp OSC
 *   disconnect
 *   sendMsg     - send an OSC message
 *
 * emits:
 *    'out'   - stdout text from the server
 *    'error' - stderr text from the server or OSC error messages
 *    'exit'  - when server exits
 *    'close' - when server closes the UDP connection
 *    'OSC'   - OSC responses from the server
 */


var
  _ = require('underscore'),
  events = require('events'),
  spawn = require('child_process').spawn,
  Logger = require('./logger'),
  dgram = require('dgram'),
  osc = require('osc-min');


/**
 *
 * Local Server - a server running on the same machine
 *
 * @param options - server command line options
 */
function LocalServer(options) {
  this.options = options;
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
 * command line args for scsynth
 *
 * not yet fully implemented
 *
 * @return list of non-default args
 */
LocalServer.prototype.args = function() {
  var o = [];
  o.push(this.options.protocol === 'udp' ? '-u' : '-t');
  o.push(this.options.serverPort);
  return o;
};


/**
 * boot
 *
 * start scsynth and establish a pipe connection
 * to receive stdout and stderr
 *
 * listen for system events and emit: exit out error
 */
LocalServer.prototype.boot = function() {
  var
    self = this,
    execPath = this.options.scsynth,
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
  this.udp.send(buf, 0, buf.length, this.options.serverPort, this.options.host);
};


module.exports = LocalServer;
