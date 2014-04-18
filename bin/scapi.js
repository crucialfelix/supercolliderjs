
/*
	Runs a webserver and web-socket server for communicating from a browser webpage to a running SuperCollider (sclang) application.

	Browser

	/fiddle.html
		A page with an interface for exploring the SC API and sending/receiving responses.
	/media/js/scapi.js
		The browser side javascript library used for communciating with this server
	/socket.io
		The javascript for socket.io (for websocket support)


    Start SuperCollider
    Install the API quark ( > 2.0 )
    Activate the OSC responders in supercollider:
      API.mountDuplexOSC

    Start this server:
        node bin/scapi-server.js

    Navigate browser to
      http://localhost:4040/fiddle.html

*/


var webserver = require('../lib/nodejs/scapi-webserver.js');

webserver.listen();


/**
  * Optional arguments:
  * schost (default: localhost)
  * scport (default: 57120)
*/

