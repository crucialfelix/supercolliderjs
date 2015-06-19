
/**
 * a less verbose way to boot up sclang
 * and intepret sc code
 *
 */


// var supercolliderjs = require('supercolliderjs');
var supercolliderjs = require('../index.js'),
  options = {
    // no STDIN, all input will be programmatic
    stdin: false,
    // echo STDOUT to console
    echo: true,
    // debug is on so you will see all traffic posted to the console
    debug: true
  };

function onError(error) {
  console.error(error);
  console.trace();
  process.exit(1);
}

supercolliderjs.sclang.boot(options)
  .then(function(sc) {

    // interpret and return result as promise
    sc.interpret('(1..8).pyramid')
      .then(function(result) {
        console.log('Result: ' + result);
      }, function(error) {
        console.log('Error:');
        console.log(error);
      });

    // this should cause a syntax error
    sc.interpret('1 + 1 oh no this is a syntax error')
      .then(function(result) {
        console.log('Result:' + result);
      }, function(error) {
        console.log('Error:');
        console.log(error);
      });

    // this should cause an error
    sc.interpret('1 + 1.pleaseDontDoThisToMe')
      .then(function(result) {
        console.log('Result:' + result);
      }, function(error) {
        console.log('Error:');
        console.log(error);
      });

  }).fail(onError);
