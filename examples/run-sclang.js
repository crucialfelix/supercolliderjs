
var SCLang = require('../lib/nodejs/sclang.js');

var dir = '/Users/crucial/code/supercollider/build/install/SuperCollider/SuperCollider-3-7.app/Contents/Resources/';

var sclang = new SCLang({'cwd': dir});
sclang.boot();

sclang.on('stdout', function(d) {
	console.log('STDOUT:' + d);
});

sclang.on('stderr', function(d) {
	console.log('STDERR:' + d);
});

// wait for it to compile
console.log('Waiting 5 seconds till sc compiles');
setTimeout(function() {
	console.log('writing to stdin: "1 + 1"');
	sclang.write("1 + 1");
}, 5000);

