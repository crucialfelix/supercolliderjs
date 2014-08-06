supercollider.js
================

Node JS tools for communicating with SuperCollider

SuperCollider is an environment and programming language for real time audio synthesis and algorithmic composition. It provides an interpreted object-oriented language which functions as a network client to a state of the art, realtime sound synthesis server.

This library provides light weight tools for communicating with scsynth (the synthesis server), sclang (supercollider language interpreter) and the SuperCollider application.

## scsynth

Run the SuperCollider synthesis server 'scsynth'. Send and receive OSC messages.

	node bin/scsynth.js

If you install supercolliderjs globally then simply:

	scsynth

Use it in your projects:

	var scsynth = require('supercolliderjs').scsynth;
	var s = new scsynth();
	s.boot();
	// wait for it to boot. not ideal
	setTimeout(function() {
	  s.connect();
	  s.sendMsg('/notify', [1]);
	  s.sendMsg('/status', []);
	  s.sendMsg('/dumpOSC', []);
	}, 1000);
	s.on('OSC', function(addr, msg) {
		// mesage from the server
		console.log(addr + msg);
	});

![scsynth](https://github.com/crucialfelix/supercolliderjs/blob/develop/docs/images/scsynth.png?raw=true)


## sclang

Run a headless language interpreter.

	node bin/sclang.js

If you install supercolliderjs globally then simply:

	sclang

By default this accepts STDIN, so its a REPL.

Use it in your projects:

	var SCLang = require('supercolliderjs').sclang;
	var sclang = new SCLang({stdin: false, echo: false});
	sclang.boot();
	// send code to be interpreted
	sclang.write("1 + 1");
	// handle stdout and stderr in any way you please
	sclang.on('stdout', function(d) {
	  console.log('STDOUT:' + d);
	});
	sclang.on('stderr', function(d) {
	  console.log('STDERR:' + d);
	});

![sclang](https://github.com/crucialfelix/supercolliderjs/blob/develop/docs/images/sclang.png?raw=true)

You could then pipe it to a webpage or to Atom or Sublime, though using the API 'interpreter.interpret' is better since you get non-blocking async and a clear connection between commands and results.

## API

Run either the full Super Collider app or a headless sclang and call API functions using the API quark.  Results are returned via callbacks or promises.

	var SCAPI = require('supercolliderjs').scapi;
	var scapi = new SCAPI();
	scapi.connect();
	// call registered API functions with a callback
	scapi.call('api.apis', [], function(response) {
	  console.log(response);
	});
	// You can interpret code or execute files.
	scapi.call('interpreter.interpret', ["1 + 1"])
		// .call returns a Q promise
		.then(function(result) {
				console.log(result);  // integer 2
			}, function(err) {
				console.log("ERROR:" + err);
			});

https://github.com/crucialfelix/API

This is better than just trying to communicate with sclang over STDOUT/STDIN.  The reply (or error) you get is directly connected with the message you sent.

You can easily write APIs for your own application just by putting a file containing a dictionary of handlers in:

	{yourquark}/apis/{apiname}.api.scd

Example server.api.scd:

	(
		boot: { arg reply, name=\default;
			Server.fromName(name).waitForBoot(reply, 100, {
				Error("Server failed to boot").throw
			});
		}
	)

## Websocket bridge for web browsers

With javascript in the browser, call SuperCollider API functions via websockets -> OSC.

	node bin/scapi.js

Javascript in the browser:

	sc = new SCApi("localhost", 4040);
	sc.call("server.boot", ["default"], function() {
		// server is booted now
		sc.call("group.new", [], function(groupID) {
			// spawn synths into this group
			sc.call("synth.new", ["scarysound", 100.0, 666.0, 7], function(synthID) {
				// enable things on the page to send control changes to the scarysound
			});
		});
	});

A test page is provided to browse the API:

![Index Screenshot](https://github.com/crucialfelix/supercolliderjs/blob/develop/docs/images/scapi.png?raw=true)


## Installation

To play with the examples you should clone clone or fork this repository:

	git clone git@github.com:crucialfelix/supercolliderjs.git

Install the dependencies:

	cd supercolliderjs
	npm install


To use this library in your own nodejs application, add it as a dependency:

	npm install supercolliderjs --save

and require the module as needed in your code:

	require('supercolliderjs').scsynth
	require('supercolliderjs').sclang
	require('supercolliderjs').scapi


## Configuration

SuperCollider is assumed to be located at `/Applications/SuperCollider/SuperCollider.app/Contents/Resources/`

If your copy is not there, then pass commandline args:

	node bin/scsynth.js --path /correct/path/to/scsynth/folder

Or better yet create a `.supercolliderjs` JSON file in your project or home directory:

	{
	    "path": "/Users/crucial/code/supercollider/build/install/SuperCollider/SuperCollider-3-7.app/Contents/Resources"
	}

Other default settings will be kept there in the future.


### Configuring SuperCollider for API

First install the API quark

In SuperCollider:

	Quarks.install("API");

	// enable the OSC in SuperCollider
	API.mountDuplexOSC;
	// and leave supercollider running


This loads the APIs that come with the API Quark.

### Start the Node.js web/api server

This runs a nodejs process that presents a little webserver, connects with browsers using websockets and communicates with SuperCollider using OSC. It currently only serves one page called "fiddle" for testing the API.

	node bin/scapi.js

In your browser open:

	open http://localhost:4040/



### In the browser

JavaScript on that page connects to the api_server using websockets
(ancient browsers will fallback to flash) which relays messages via OSC to SuperCollider's API Quark

	// javascript
	sc = new SCApi("localhost",4040);
	sc.call("server.boot", ["default"], function() {
		// server is booted now
		sc.call("group.new", [], function(groupID) {
			// spawn synths into this group
		});
	});

call returns a jQuery Deferred so you should  be able to use libraries like async.

[TODO write examples of this]

Results are returned in JSON format so the SuperCollider APIs can return dictionaries and lists and these will be available as JavaScript objects in the return function.

### Command line

If you install supercolliderjs globally

		npm install -g supercolliderjs

then `scsynth` `sclang` and `scapi` will be added to your path and you can use this to easily start up an sclang or scsynth process.

TODO:
- Passing full command line args including class dirs
- getting server options from your ~/.supercolliderjs file
- passing file args so `sclang path/to/some/file.scd` would work


### Security

At the moment the API quark exposes "interpreter.interpret" and "synthdef.new" which would allow all kinds of mischeif.


## Things you could do with this

Hooking up your JavaScript/processing.js app to easily trigger and control sounds from the Instr sound library.  [no knowledge of SuperCollider required, just read the API and play with it]

Build dynamic localhosted web apps that communicate with your personal local copy of SuperCollider.  Make use of the rich library of JavaScript graphics, networking and UI libraries.  JavaScript on V8 in Chrome browser and in Node.js is significantly faster than SuperCollider and has a much larger array of development tools and documentation.  WebKit has a full featured debugger with breakpoints and all of that.

Deploy webapps to a public server so that visitors can interact with your SuperCollider language based apps or can interact to play with sounds on the SC server.  The server can be piped into Icecast and streamed back to the visitors or it could be used in an exhibition or gallery situation where everybody can hear it.

It uses http://socket.io which is loads of fun and should prove quite useful for installations and pieces that allow many people to interact with a single SuperCollider using mobile phones over normal webrowsers. Visitors can communicate with each other and messages can be broadcast to all joined parties.
