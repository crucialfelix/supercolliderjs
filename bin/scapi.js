#!/usr/bin/env node
/*
  Runs a websockets <-> OSC bridge for communicating
  from a browser through to SuperCollider

  Usage:

    Start SuperCollider
    Install the API quark ( > 2.0 )
    Activate the OSC responders in supercollider:
      API.mountDuplexOSC

    Start this server:

    // serves a default page where you can view registered API endpoints
    // and make api calls, get resposnes
    // A page with an interface for exploring the SC API and sending/receiving responses.
    scapi

    // Starts a webserver with the specified path as web root.
    // eg: current directory
    scapi ./

  These special URLs are also served:

  /static/js/scapi.js
    The browser side javascript library used for communciating with this server

  /socket.io
    The javascript for socket.io (for websocket support)

  If you have installed this package globally then 'scapi' is on your path.

  If you have cloned this then call the file directly using node:

      node bin/scapi-server.js

  Navigate browser to:

      http://localhost:4040/

*/

var
  join = require('path').join,
  pkg = require(join(__dirname, '../package.json')),
  lib = join(__dirname, '../lib/nodejs/'),
  program = require('commander'),
  resolveOptions = require('../lib/nodejs/resolveOptions'),

  webserver = require(lib + 'webserver'),
  options = {},
  root;

program.version(pkg.version)
  .option('--config <path>', 'Configuration file eg. .supercollider.yaml')
  .option('-p --port <port>', 'Port to run local webserver on [default=4040]');

program.parse(process.argv);

['config', 'verbose'].forEach(function(k) {
  if (k in program) {
    options[k] = program[k];
  }
});

if (program.port) {
  options.websocketPort = program.port;
}

if (program.args.length) {
  root = program.args[0];
}

resolveOptions(program.config, options)
  .then(function(opts) {
    webserver.listen(root, opts);
  });
