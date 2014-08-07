supercollider.js
================

Node JS and webrowser tools for working with SuperCollider.

SuperCollider is an environment and programming language for real time audio synthesis and algorithmic composition. It provides an interpreted object-oriented language which functions as a network client to a state of the art, realtime sound synthesis server.

This library provides tools for working with:

- scsynth (the synthesis server)
- sclang (supercollider language interpreter)
- sclang running in SuperCollider application (IDE + sclang).


Documentation
-------------

http://supercolliderjs.readthedocs.org/en/latest/


Features
--------

- Spawn headless SuperCollider language interpreters (sclang)
- Execute SuperCollider code from node js and get results or errors returned as JSON
- Spawn SuperCollider synthesis servers (scsynth)
- Send and receive OSC messages to scsynth
- Call API endpoints in SuperCollider from a browser using JavaScript and a websocket/OSC bridge
- Communicate with sclang running in SuperCollider.app (SC IDE) using OSC


Example
-------

		var scjs = require('supercolliderjs');
		var SCLang = scjs.sclang;

		scjs.resolveOptions().then(function(options) {

			var sclang = new SCLang(options);

			sclang.boot()
				.then(function() {
					sclang.initInterpreter(function() {
						console.log('(1..8).pyramid');
						sclang.interpret('(1..8).pyramid')
							.then(function(result) {
								// JSON
								console.log('= ' + result);
							}, function(error) {
								console.log(error);
							});
					});
				});
		});


Contribute
----------

- Issue Tracker: https://github.com/crucialfelix/supercolliderjs/issues
- Source Code: https://github.com/crucialfelix/supercolliderjs


License
-------

The project is licensed under the MIT license.
