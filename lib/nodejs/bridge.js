/* jslint node: true */


/**
 *
 * A bridge between a web browser and sclang
 * =========================================
 *
 *  websockets <-> OSC
 *
 * Adds socket.io to an express app server
 *
 * Serves socket.io and scapi.js
 *
 * Connects with sclang using OSC
 *
 * Listens for websocket connections and relays
 * calls to sclang, returns responses to the websocket client
 *
 * Usage::
 *   scjs = require('supercolliderjs');
 *   app = express(),
 *   server = http.createServer(app),
 *   scjs.listen(app, server);
 *
 * params:
 *   app:    an express app
 *   server: an http server created by express
 *   io:     optional socket.io connection
 *           You may pass in an already existing one
 *           that is shared with other parts of your application
 *   schost: host that sclang is listening on [default=localhost]
 *   scport: port that sclang is listenting on [default=57120]
 *   scapiJsUrl: the URL that your web page will use to retreive
 *               the browser version of scapi.js
 *               [default=/static/scapi.js]
 */


var
  join = require('path').join,
  socketio = require('socket.io'),
  express = require('express'),
  SCAPI = require('./scapi');


module.exports = {};

module.exports.listen = function(app, server, io, schost, scport, scapiJsUrl) {

  this.schost = schost ? schost : 'localhost';
  this.scport = scport ? scport : 57120;

  // hold these so you can unlisten
  var self = this,
      scapi = new SCAPI(this.schost, this.scport);

  if(!io) {
    io = socketio.listen(server);
  }

  // connect to supercollider
  scapi.connect();

  // handle any errors outside of call/response requests
  scapi.on('error', function(err) {
    console.log('Out of band scapi error', err);
  });

  // serve the client side javascript
  app.get(scapiJsUrl || '/static/js/scapi.js', function (req, res) {
    res.sendfile(join(__dirname, '../browser/scapi.js'));
  });

  // serve socket.io directory which includes various resources
  // like flash fallbacks
  app.use('/socket.io', express.static(__dirname + '../node_modules/socket.io/lib'));

  // listen to incoming websockets
  io.sockets.on('connection', function(socket) {
    socket.on('call', function (data) {
      // communicate with sclang
      var request_id = data.request_id;
      scapi.call(request_id, data.path, data.args)
        .then(function(response) {
          socket.emit('reply', {
            'request_id': request_id,
            'result': response.result
          });
        }, function(err) {
          socket.emit('scapi_error', {
            'request_id': request_id,
            'result': err.result
          });
        });
    });
  });

};
