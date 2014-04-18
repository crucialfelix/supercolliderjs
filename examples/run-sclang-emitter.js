
/**
 * this shows how to capture output of sclang
 * and do anything you like with it.
 *
 * But default sclang.js echoes everything to the console.
 *
 */

var SCLang = require('../lib/nodejs/sclang.js');

var dir = '/Users/crucial/code/supercollider/build/install/SuperCollider/SuperCollider-3-7.app/Contents/Resources/';

// do not echo to console
var sclang = new SCLang({'cwd': dir, 'echo': false});
sclang.boot();

// get output and do what you like with it
sclang.on('stdout', function(d) {
  console.log('STDOUT:' + d);
});

sclang.on('stderr', function(d) {
  console.log('STDERR:' + d);
});

// need to wait for it to compile
console.log('Waiting 5 seconds till sc compiles...');
setTimeout(function() {
  console.log('writing to STDIN: "1 + 1"');
  sclang.write("1 + 1");
}, 5000);
