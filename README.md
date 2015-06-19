supercollider.js
================

[![npm version](https://badge.fury.io/js/supercolliderjs.svg)](http://badge.fury.io/js/supercolliderjs) [![Build Status](https://travis-ci.org/crucialfelix/supercolliderjs.svg?branch=master)](https://travis-ci.org/crucialfelix/supercolliderjs) [![Dependency Status](https://david-dm.org/crucialfelix/supercolliderjs.svg)](https://david-dm.org/crucialfelix/supercolliderjs) [![devDependency Status](https://david-dm.org/crucialfelix/supercolliderjs/dev-status.svg)](https://david-dm.org/crucialfelix/supercolliderjs#info=devDependencies)


Node JS tools for working with the SuperCollider language and synthesis server.

SuperCollider is an environment and programming language for real time audio synthesis and algorithmic composition. It provides an interpreted object-oriented language which functions as a network client to a state of the art, realtime sound synthesis server.

This library provides tools for working with:

- scsynth (the synthesis server)
- sclang (supercollider language interpreter)


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
