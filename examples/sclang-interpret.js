
/**
 * This shows how to capture output of sclang
 * and do anything you like with it.
 *
 * But default sclang.js echoes everything to the console.
 *
 */

// npm install supercolliderjs
// then import like so:
// var supercolliderjs = require('supercolliderjs');

// from within this example folder this is the same thing:
var sc = require('../index.js');
var SCLang = sc.lang.SCLang;

sc.resolveOptions(null, {
  // no STDIN, all input will be programmatic
  stdin: false,
  // do not echo to console, that's handled here
  echo: false,
  debug: true
}).then(function(options) {

  var sclang = new SCLang(options);

  // get output and do what you like with it
  sclang.on('stdout', function(d) {
    console.log('STDOUT:' + d);
  });

  sclang.on('stderr', function(d) {
    console.log('STDERR:' + d);
  });

  sclang.on('state', function(state) {
    console.log('sclang state changed: ' + state);
  });

  sclang.boot()
    .then(function() {
      return sclang.initInterpreter();
    })
    .then(function() {
      // interpret and return result in promise

      function resultHandler(result) {
        console.log('Result:');
        console.log(result);
      }

      function errorHandler(error) {
        console.log('Error:');
        console.log(error);
      }

      // ok success
      sclang.interpret('1 + 1')
        .then(resultHandler, errorHandler);

      // syntax error
      sclang.interpret('1 + 1 oh no this is a syntax error')
        .then(resultHandler, errorHandler);

      // runtime error
      sclang.interpret('1 + 1.pleaseDontDoThisToMe')
        .then(resultHandler, errorHandler);

      // test out of band error

    });
});
