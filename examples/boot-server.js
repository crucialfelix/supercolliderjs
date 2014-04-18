/*
	this just boots the local scsynth server,
	holding it as a spawned child process.

	next step: osc message to the server
*/


var scsynth = require('../lib/nodejs/scsynth.js');

var p = '/Users/crucial/code/supercollider/build/install/SuperCollider/SuperCollider-3-7.app/Contents/Resources/';

var s = new scsynth({
					'cwd': p
				});


s.boot();

console.log('s.options', s.options);

// s.sendMsg()

// s.quit();
