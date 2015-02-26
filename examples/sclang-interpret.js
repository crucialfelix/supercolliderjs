
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
      sclang.interpret('1 + 1')
        .then(function(result) {
          console.log('Answer should be 2: ' + result);
        }, function(type, err) {
          console.log('Error (should not be any error):' + type);
          console.log(err);
        });

      // syntax error
      sclang.interpret('1 + 1 oh no this is a syntax error')
        .then(function(result) {
          console.log('Answer is: (should be syntax error)' + result);
        }, function(type, err) {
          console.log('Error (should be syntax error):' + type);
          console.log(err);
        });

      // runtime error
      sclang.interpret('1 + 1.pleaseDontDoThisToMe')
        .then(function(result) {
          console.log('Answer is: (should be runtime error)' + result);
        }, function(err) {
          console.log('error (should be Error):');
          console.log(err);
          // { type: 'Error',
          //   error:
          //    { selector: 'pleaseDontDoThisToMe',
          //      what: 'DoesNotUnderstandError',
          //      args: [],
          //      receiver: { asString: '1', class: 'Integer' },
          //      class: 'DoesNotUnderstandError',
          //      path: '5f4b9581-1c83-11e4-bff4-77673f16fd9d',
          //      errorString: 'ERROR: Message \'pleaseDontDoThisToMe\' not understood by Integer 1' } }
        });

        // out of band error

      });
});
