/* jslint node: true */

/*
 *
 *  Communicates via OSC with the SuperCollider API quark
 *
 *  The 'API' quark implements a two-way communication protocol.
 *  This nodejs code implements the other end of that communcation.
 *
 *  It connects with an sclang process using UDP OSC
 *  and then sends OSC messages to '/API/call'
 *
 *  Sent messages return a promise,
 *  the responses are received here from sclang
 *  and the promises are resolved
 *  (or rejected if there was an error).
 *
 *  Start SuperCollider
 *  Install the API quark ( > 2.0 )
 *  Activate the OSC responders in supercollider:
 *    API.mountDuplexOSC
 *
 *  See examples/call-api-from-node.js
*/

var
  events = require('events'),
  dgram = require('dgram'),
  osc = require('osc-min'),
  uuid = require('node-uuid'),
  Q = require('q');


function SCAPI(schost, scport) {
  this.schost = schost ? schost : 'localhost';
  this.scport = scport ? scport : 57120;
  this.requests = {};
}


SCAPI.super_ = events.EventEmitter;
SCAPI.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: SCAPI,
        enumerable: false
    }
});


SCAPI.prototype.connect = function() {

  var self = this;
  this.udp = dgram.createSocket('udp4');

  this.udp.on('message', function(msgbuf, rinfo) {
    var msg = osc.fromBuffer(msgbuf);
    if(msg.address === '/API/reply') {
      return self.receive('reply', msg);
    }
    return self.receive('scapi_error', msg);
  });

  this.udp.on('error', function(e) {
    self.emit('error', e);
  });
};


SCAPI.prototype.disconnect = function() {
  if(this.udp) {
    this.udp.close();
    delete this.udp;
  }
};


SCAPI.prototype.call = function(oscpath, args, ok, err) {

  var
    request_id = uuid.v1(),
    client_id = 0, // no longer needed
    a = [client_id, request_id, oscpath],
    deferred = Q.defer(),
    promise = deferred.promise;

  args = a.concat(args ? args : []);

  var buf = osc.toBuffer({
    address : '/API/call',
    args : args
  });
  this.udp.send(buf, 0, buf.length, this.scport, this.schost);
  this.requests[request_id] = deferred;

  if(ok) {
    promise.then(ok, err);
  }
  return promise;
};


SCAPI.prototype.receive = function(signal, msg) {

  var
    client_id = msg.args[0].value,
    request_id = msg.args[1].value,
    result = msg.args[2].value,
    request = this.requests[request_id];


  if(!request) {
    this.emit('error', 'Unknown request ' + request_id);
    return;
  }

  // reply or scapi_error
  if(signal === 'reply') {
    try {
      result = JSON.parse(result);
      result = result.result;
    } catch(e) {
      result = 'MALFORMED JSON RESPONSE:' + result;
      signal = 'scapi_error';
    }
  }

  var response = {
    'signal': signal,
    'request_id': request_id,
    'result': result
  };

  if(signal === 'reply') {
    request.resolve(response);
  } else {
    request.reject(response);
  }
  delete this.requests[request_id];
};


module.exports = SCAPI;
