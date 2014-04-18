
/**
 * this shows how to capture output of sclang
 * and do anything you like with it.
 *
 * But default sclang.js echoes everything to the console.
 *
 */

var SCLang = require('../lib/nodejs/sclang.js');
var options = require('../lib/nodejs/parse-options');


var o = options();
// do not echo to console
o.echo = false;

var sclang = new SCLang(o);

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
  sclang.write('1 + 1');
}, 5000);
