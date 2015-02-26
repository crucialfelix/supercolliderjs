
/**
 * this shows how to capture output of sclang
 * and do anything you like with it.
 *
 * But default sclang.js echoes everything to the console.
 *
 */

// npm install supercolliderjs
// then import like so:
// var supercolliderjs = require('supercolliderjs');

// from within this example folder this is the same thing:
var supercolliderjs = require('../index.js');
var SCLang = supercolliderjs.sclang;

supercolliderjs.resolveOptions(null, {
  // no STDIN, all input will be programmatic
  stdin: false,
  // do not echo to console, that's handled here
  echo: false
}).then(function(options) {

  var sclang = new SCLang(options);

  // sclang will emit the 'stdout' event
  sclang.on('stdout', function(d) {
    console.log('STDOUT:' + d);
  });

  // and 'stderr' but these are system level errors
  // not syntax or sc run time errors
  sclang.on('stderr', function(d) {
    console.log('STDERR:' + d);
  });

  sclang.boot()
    .then(function() {
      console.log('writing to STDIN: "1 + 1"');
      sclang.write('1 + 1');
    });

});
