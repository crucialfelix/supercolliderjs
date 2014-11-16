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
  Q = require('q'),
  _ = require('underscore'),
  Logger = require('./logger');

function SCAPI(schost, scport) {
  this.schost = schost ? schost : 'localhost';
  this.scport = scport ? scport : 57120;
  this.requests = {};
  this.log = new Logger(true, false);
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
    if (msg.address === '/API/reply') {
      return self.receive('reply', msg);
    }
    return self.receive('scapi_error', msg);
  });

  this.udp.on('error', function(e) {
    self.emit('error', e);
    this.log.err('ERROR:' + e);
  });
};

SCAPI.prototype.disconnect = function() {
  if (this.udp) {
    this.udp.close();
    delete this.udp;
  }
};

SCAPI.prototype.call = function(requestId, oscpath, args, ok, err) {

  var
    clientId = 0, // no longer needed
    a = [clientId, requestId, oscpath],
    deferred = Q.defer(),
    promise = deferred.promise,
    clumps,
    self = this;

  args = args ? args : [];

  function sender(requestId, oscArgs) {
    var
      buf = osc.toBuffer({
        address : '/API/call',
        args : [clientId, requestId, oscpath].concat(oscArgs)
      });
    self.udp.send(buf, 0, buf.length, self.scport, self.schost,
      function(err, bytes) {
        // DNS errors
        // but not packet-too-big errors
        if(err) {
          self.log.err(err);
        }
      }
    );
  }

  this.requests[requestId] = deferred;

  if (ok) {
    promise.then(ok, err);
  }

  function isNotOsc(a) {
    // if any arg is an object or array
    // or a large strig then pass the args as JSON
    // in multiple calls
    return _.isObject(a) || _.isArray(a) || (_.isString(a) && a.length > 7168);
  }

  if(_.some(args, isNotOsc)) {
    clumps = JSON.stringify(args).match(/.{1,7168}/g);
    _.each(clumps, function(clump, i) {
      var rid = '' + (i + 1) + ',' + clumps.length + ':' + requestId;
      sender(rid, [clump]);
    });
  } else {
    sender(requestId, args);
  }

  return promise;
};

SCAPI.prototype.receive = function(signal, msg) {

  var
    clientId = msg.args[0].value,
    requestId = msg.args[1].value,
    result = msg.args[2].value,
    request = this.requests[requestId];
  if (!request) {
    this.emit('error', 'Unknown request ' + requestId);
    this.log.err('Unknown request ' + requestId);
    return;
  }

  // reply or scapi_error
  if (signal === 'reply') {
    try {
      result = JSON.parse(result);
      result = result.result;
    } catch (e) {
      result = 'MALFORMED JSON RESPONSE:' + result;
      this.log.err(result);
      signal = 'scapi_error';
    }
  }

  var response = {
    'signal': signal,
    'request_id': requestId,
    'result': result
  };

  if (signal === 'reply') {
    request.resolve(response);
  } else {
    request.reject(response);
  }
  delete this.requests[requestId];
};

module.exports = SCAPI;
