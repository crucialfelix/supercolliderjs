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

		scjs.sclang.boot()
			.then(function(sclang) {

				sclang.interpret('(1..8).pyramid')
					.then(function(result) {
						// result is a native javascript array
						console.log('= ' + result);
					}, function(error) {
						// syntax or runtime errors
						// are returned as javascript objects
						console.log(error);
					});

			});


Compatibility
-------------

Works on Node 0.10.x, 0.11.x, 0.12.x and iojs 2.3

Note that the testing framework (jest) does not work on anything except Node 0.10.x, so travis is currently not set to test any other versions.


Contribute
----------

- Issue Tracker: https://github.com/crucialfelix/supercolliderjs/issues
- Source Code: https://github.com/crucialfelix/supercolliderjs


License
-------

The project is licensed under the MIT license.
