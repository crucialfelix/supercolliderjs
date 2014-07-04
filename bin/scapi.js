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
	path = require('path'),
	lib = path.join(__dirname, '../lib/nodejs/'),
	webserver = require(lib + 'webserver'),
	root = null;
	// options = require(lib + 'parse-options')();

if(process.argv.length > 2) {
	root = process.argv[2];
}

webserver.listen(null, null, null, null, root);
