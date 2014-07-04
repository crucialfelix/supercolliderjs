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
  path = require('path'),
  bridge = require('./bridge'),
  spawn = require('child_process').spawn;

var webserver = {};
module.exports = webserver;


/**
 *
 * Listen for web and websocket connections.
 *
 */

webserver.listen = function(host, port, schost, scport, root) {
  this.host = host ? host : 'localhost';
  this.port = port ? port : 4040;

  // hold these so you can unlisten
  var self = this,
    app = express(),
    server = http.createServer(app),
    url = 'http://' + this.host + ':' + this.port;

  server.listen(this.port);
  console.log('Listening on ' + url);

  bridge.listen(app, server);

  if(root) {
    root = path.resolve(root);
    app.use(express.static(root));
  } else {
    app.use(express.static(__dirname + '/../templates'));
  }
  spawn('open', [url]);
};
