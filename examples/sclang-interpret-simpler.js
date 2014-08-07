
/**
 * a less verbose way to boot up sclang
 * and intepret sc code
 *
 */


// var scjs = require('supercolliderjs');
var scjs = require('../index.js'),
  options = {
    // no STDIN, all input will be programmatic
    stdin: false,
    // echo STDOUT to console
    echo: true,
    debug: true
  };

scjs.sclang.boot(options)
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

  });
