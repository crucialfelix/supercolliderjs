supercollider.js
================

Tools for communicating with the SuperCollider music synthesis language and directly with the SuperCollider synthesis server.

SuperCollider is an environment and programming language for real time audio synthesis and algorithmic composition. It provides an interpreted object-oriented language which functions as a network client to a state of the art, realtime sound synthesis server.

SuperCollider.js communicates with the language application and directly with the synthesis server, using OSC in both cases.

It contains code for use on a server (under Node.js)

and it also includes code for use in the browser:

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


It is not yet on npm but will be soon.

Things you could do with this
-----------------------------

Hooking up your JavaScript/processing.js app to easily trigger and control sounds from the Instr sound library.  [no knowledge of SuperCollider required, just read the API and play with it]

Build dynamic localhosted web apps that communicate with your personal local copy of SuperCollider.  Make use of the rich library of JavaScript graphics, networking and UI libraries.  JavaScript on V8 in Chrome browser and in Node.js is significantly faster than SuperCollider and has a much larger array of development tools and documentation.  WebKit has a full featured debugger with breakpoints and all of that.

Deploy webapps to a public server so that visitors can interact with your SuperCollider language based apps or can interact to play with sounds on the SC server.  The server can be piped into Icecast and streamed back to the visitors or it could be used in an exhibition or gallery situation where everybody can hear it.

It uses http://socket.io which is loads of fun and should prove quite useful for installations and pieces that allow many people to interact with a single SuperCollider using mobile phones over normal webrowsers. Visitors can communicate with each other and messages can be broadcast to all joined parties.

Build standalone applications using App.js etc.


Communicate with the SuperCollider language via the API Quark
=============================================================

[webbrowser] =websockets=> [node api_server.js]

=OSC=> [API Quark in supercollider] =sc-calls-the-API=> [your API]

and then the reply:

[API Quark] =OSC=> [node api_server.js]

=websockets=> [browser]


In SuperCollider
----------------

	// make sure you have the Quark
	Quarks.install("API");

	// enable the OSC in SuperCollider
	API.mountDuplexOSC;

This loads the APIs that come with the API Quark.  See API below.

You can easily write APIs for your own application just by putting a file containing a dictionary of handlers in:

	{yourquark}/apis/{apiname}.api.scd


Start the Node.js web/api server
----------------------------

In a terminal start the webserver listening on localhost:4040

	node api_server.js

Navigate to http://localhost:4040/

This is a webserver, a websocket server and an OSC client.

![Index Screenshot](https://github.com/crucialfelix/supercolliderjs/blob/master/examples/images/index-screenshot.png?raw=true)

In the browser
--------------

javascript on that page connects to the api_server using websockets
(ancient browsers will fallback to flash)
which relays messages via OSC to SuperCollider's API Quark

	sc = new SCApi("localhost",4040);
	sc.call("server.boot", ["default"], function() {
		// server is booted now
		sc.call("group.new", [], function(groupID) {
			// spawn synths into this group
		});
	});

[Note: calls will soon support jQuery Deferreds so that this pyramid of callback death can be dispensed with]

Results are returned in JSON format so the SuperCollider APIs can return dictionaries and lists and these will be available as JavaScript objects in the return function.

Security
--------

At the moment the API quark exposes "interpreter.interpret" and "synthdef.new" which would allow all kinds of mischeif.

So you probably don't want to do this [1]:

	gem install localtunnel
	localtunnel 4040

Navigate to the URL it posts.  Your laptop is now available on a public URL.

People will come and sniff your packets.  Be forewarned.

[1] http://progrium.com/localtunnel/


Planned
-------

See ISSUES on github

Calls will return jQuery Promises so that libraries like Q and Async can be used for chaining, waterfall, parallel etc.  This is a coding style that is well suited to working with the SuperCollider server.

Support to send directly to scsynth without going through API and the language.

eg.

	sc.server.sendMsg("set",nodeID,"freq",300);

It receives JSON objects like {key: value, list: [1,2,3]} but at the moment doesn't send objects in requests.  SuperCollider needs a solid and safe JSON parser.  3.6 has a YAML parser I think.

Mx, Instr and Patch will have full API support for web-based guis.  Equivalents to Instr browser and the Mx patching interface that currently exist in SuperCollider (but are much slower there).

Develop the npm package more so the server code can be easily imported, extended, tweaked and reused.

Some way to either generate a project from a template or by forking a repo so that people can throw together sketches very quickly.

Command line args to the server.


Direct Communication with the Server
====================================

Initially all I've finished implementing is starting the server:

	node boot-server.js

[Note for sc people: This is done as a proper child process so there is no need of the alive thread and guessing-game that SuperCollider language currently does.  The death of the server is instantly known and never exagerrated.]

Planned
-------

I had some problems with the OSC library I was using and am going to switch it to min-osc.

I'm not intending to replicate the SuperCollider language framework.  I wrote or worked on many of the base classes for SuperCollider (Node Synth Group Bus Buffer etc) but they have become quite messy and have multiple usage styles piled on top of each other.  Javascript is more flexible with mixins and prototypical inheritance so its easier to separate usage styles and keep packages clean.

The classes here will use Node's EventEmitter for Server and Synth/Group notifications.

API
===

This is probably out of date already:

	group.head
	group.free
	group.tail
	group.new
	instr.list
	instr.play
	instr.head
	instr.detail
	instr.listBySpec
	instr.addSynthDesc
	instr.after
	instr.loadAll
	instr.tail
	instr.before
	instr.replace
	class.allClasses
	class.subclasses
	class.helpFile
	class.helpFilePath
	class.hasHelpFile
	class.allSubclasses
	API.apis
	API.paths
	interpreter.interpret
	interpreter.play
	interpreter.executeFile
	server.freeAll
	server.boot
	server.sendMsg
	server.quit
	server.nextNodeID
	server.isRunning
	synth.head
	synth.release
	synth.grain
	synth.free
	synth.tail
	synth.new
	synth.get
	synth.set
	synthdef.remove
	synthdef.add


LICENSE
=======

For now its GPL like SuperCollider.


