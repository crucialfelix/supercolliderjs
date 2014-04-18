/* jslint node: true */

/*
  Node.js web and websocket server for communicating with SuperCollider

  This allows javascript on webpages to easily communicate with a running SuperCollider language application via APIs.

  Start SuperCollider
  Install the API quark ( > 2.0 )
  Activate the OSC responders in supercollider:
    API.mountDuplexOSC
  Start this server:
    node bin/scapi.js

  Navigate browser to
    http://localhost:4040/fiddle.html

*/

var
  express = require('express'),
  http = require('http'),
  join = require('path').join,
  socketio = require('socket.io'),
  SCAPI = require('./scapi');


var webserver = {};
module.exports = webserver;


/**
 *
 * Listen for web and websocket connections.
 *
 */

webserver.listen = function(host, port, schost, scport) {
  this.host = host ? host : 'localhost';
  this.port = port ? port : 4040;
  this.schost = schost ? schost : 'localhost';
  this.scport = scport ? scport : 57120;

  // hold these so you can unlisten
  var self = this,
    app = express(),
    server = http.createServer(app),
    io = socketio.listen(server),
    tplRoot = join(__dirname, '../templates/'),
    scapi = new SCAPI(this.schost, this.scport);

  // connect to supercollider
  scapi.connect();

  // handle any errors outside of call/response requests
  scapi.on('error', function(err) {
    console.log('Out of band scapi error', err);
  });

  // start webserver
  server.listen(this.port);
  console.log('Listening on http://localhost:' + this.port);

  app.get('/', function (req, res) {
    res.sendfile(join(__dirname, '../templates/fiddle.html'));
  });

  // serve the client side javascript
  app.get('/media/js/scapi.js', function (req, res) {
    res.sendfile(join(__dirname, '../browser/scapi.js'));
  });

  // serve socket.io directory, various resources
  app.use('/socket.io',
    express.static(__dirname + '../node_modules/socket.io/lib'));

  // incoming websockets
  io.sockets.on('connection', function(socket) {
    socket.on('call', function (data) {
      scapi.call(data.path, data.args)
        .then(function(response) {
          socket.emit('reply', {
            'request_id': data.request_id,
            'result': response.result
          });
        }, function(err) {
          socket.emit('scapi_error', {
            'request_id': err.request_id,
            'result': err.result
          });
        });
    });
  });

};
