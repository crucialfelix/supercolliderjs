
/**
 * this shows how to capture output of sclang
 * and do anything you like with it.
 *
 * But default sclang.js echoes everything to the console.
 *
 */

// npm install supercolliderjs
// then import like so:
// var scjs = require('supercolliderjs');

// from within this example folder this is the same thing:
var scjs = require('../index.js');
var SCLang = scjs.sclang;

scjs.resolveOptions(null, {
  // no STDIN, all input will be programmatic
  stdin: false,
  // do not echo to console, that's handled here
  echo: false
}).then(function(options) {

  var sclang = new SCLang(options);

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
});
