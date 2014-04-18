/*
	this just boots the local scsynth server,
	holding it as a spawned child process.

	next step: osc message to the server
*/


var scsynth = require('../lib/nodejs/scsynth.js');
var options = require('../lib/nodejs/parse-options');


var s = new scsynth(options());


s.boot();

console.log('s.options', s.options);

// s.sendMsg()

// s.quit();
