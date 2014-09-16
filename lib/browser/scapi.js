/* global window */

/*
    assumes the presence of:
        $ = jQuery
        io = socket.io
*/

(function(window, $, io) {

  'use strict';

  function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid;
  }

  var SCApi = function() {

    var self = this;
    var Deferred = $.Deferred;

    this.socket = io.connect();

    this.calls = {};

    this.call = function(path, args, success, error) {
      var
        d = Deferred(),
        requestId = generateUUID();

      if (success) {
        d.done(success);
      }
      d.fail(error || console.log);
      // but request_id is set in bridge to be a uuid
      // and you cannot allow the client to just spoof this
      // how else do you get the request id ?
      self.calls[requestId] = d;
      self.socket.emit('call', {
        'request_id': requestId,
        path: path, args: args
      });
      return d;
    };

    this.socket.on('reply', function (data) {
      self.calls[data['request_id']].resolve(data.result);
      delete self.calls[data['request_id']];
    });

    this.socket.on('scapi_error', function (data) {
      self.calls[data['request_id']].reject(data.result);
      delete self.calls[data['request_id']];
    });

  };

  window.SCApi = SCApi;

})(window, window.$, window.io);
