/* jslint node: true */

var
  _ = require('underscore'),
  events = require('events'),
  spawn = require('child_process').spawn;

var defaultOptions = {
  'ip': '127.0.0.1',
  'port': 57110,
  'protocol': 'tcp',

  'path': '/Applications/SuperCollider/SuperCollider.app/Contents/Resources/',

  'numPrivateAudioBusChannels': 112,
  'numControlBusChannels': 4096,
  'numInputBusChannels': 8,
  'numOutputBusChannels': 8,
  'numBuffers': 1026,

  'maxNodes': 1024,
  'maxSynthDefs': 1024,
  'blockSize': 64,
  'hardwareBufferSize': null,

  'memSize': 8192,
  'numRGens': 64,
  'numWireBufs': 64,

  'sampleRate': null,
  'loadDefs': false,

  'inputStreamsEnabled': false,
  'outputStreamsEnabled': false,

  'inDevice': null,
  'outDevice': null,

  'verbosity': 0,
  'zeroConf': false, // Whether server publishes port to Bonjour, etc,

  'restrictedPath': null,

  'initialNodeID': 1000,
  'remoteControlVolume': false,

  'memoryLocking': false,
  'threads': null // for supernova
};


/*
  asOptionsString { | port = 57110 |
  var o;
  o = if (protocol == \tcp, ' -t ', ' -u ');
  o = o ++ port;

    o = o ++ ' -a ' ++ (numPrivateAudioBusChannels + numInputBusChannels + numOutputBusChannels) ;

  if (numControlBusChannels != 4096, {
    o = o ++ ' -c ' ++ numControlBusChannels;
  });
  if (numInputBusChannels != 8, {
    o = o ++ ' -i ' ++ numInputBusChannels;
  });
  if (numOutputBusChannels != 8, {
    o = o ++ ' -o ' ++ numOutputBusChannels;
  });
  if (numBuffers != 1024, {
    o = o ++ ' -b ' ++ numBuffers;
  });
  if (maxNodes != 1024, {
    o = o ++ ' -n ' ++ maxNodes;
  });
  if (maxSynthDefs != 1024, {
    o = o ++ ' -d ' ++ maxSynthDefs;
  });
  if (blockSize != 64, {
    o = o ++ ' -z ' ++ blockSize;
  });
  if (hardwareBufferSize.notNil, {
    o = o ++ ' -Z ' ++ hardwareBufferSize;
  });
  if (memSize != 8192, {
    o = o ++ ' -m ' ++ memSize;
  });
  if (numRGens != 64, {
    o = o ++ ' -r ' ++ numRGens;
  });
  if (numWireBufs != 64, {
    o = o ++ ' -w ' ++ numWireBufs;
  });
  if (sampleRate.notNil, {
    o = o ++ ' -S ' ++ sampleRate;
  });
  if (loadDefs.not, {
    o = o ++ ' -D 0';
  });
  if (inputStreamsEnabled.notNil, {
    o = o ++ ' -I ' ++ inputStreamsEnabled ;
  });
  if (outputStreamsEnabled.notNil, {
    o = o ++ ' -O ' ++ outputStreamsEnabled ;
  });
  if ((thisProcess.platform.name!=\osx) or: {inDevice == outDevice})
  {
    if (inDevice.notNil,
    {
      o = o ++ ' -H %'.format(inDevice.quote);
    });
  }
  {
    o = o ++ ' -H % %'.format(inDevice.asString.quote, outDevice.asString.quote);
  };
  if (verbosity != 0, {
    o = o ++ ' -v ' ++ verbosity;
  });
  if (zeroConf.not, {
    o = o ++ ' -R 0';
  });
  if (restrictedPath.notNil, {
    o = o ++ ' -P ' ++ restrictedPath;
  });
  if (memoryLocking, {
    o = o ++ ' -L';
  });
  if (threads.notNil, {
    if (Server.program.asString.endsWith('supernova')) {
      o = o ++ ' -T ' ++ threads;
    }
  });
*/


/**
 *
 * Local Server - a server running on the same machine
 *
 * @param options - server command line options
 */
function LocalServer(options) {
  this.options = _.extend(defaultOptions, options ? options : {});
  this.process = null;
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
  console.log(execPath);
  this.process = spawn(execPath, this.args(),
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this.options.cwd
    });

  console.log('spawned ' + this.process.pid);

  this.process.on('error', function(err){
    console.log('Server error ' + err);
    self.emit('exit', err);
  });
  this.process.on('close', function(code, signal){
    console.log('Server closed ' + code);
    self.emit('exit', code);
  });
  this.process.on('exit', function(code, signal){
    console.log('Server exited ' + code);
    self.emit('exit', code);
  });

  this.process.stdout.on('data', function(data){
    console.log(' ' + data);
    self.emit('out', data);
  });
  this.process.stderr.on('data', function(data){
    console.log('err! ' + data);
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
