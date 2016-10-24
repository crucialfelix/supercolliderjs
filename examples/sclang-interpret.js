#!/usr/bin/env node

/**
 * a less verbose way to boot up sclang
 * and intepret sc code
 */

// var supercolliderjs = require('supercolliderjs');
var supercolliderjs = require('../index.js');
var options = {
    // Do not send STDIN from console to sclang,
    // all input will be sent to sclang programmatically.
    stdin: false,
    // Do not echo input sent to sclang to console
    echo: false,
    // Turn debug on if you want to see all STDOUT posted to the console
    // this includes the two way JSON communication between supercollider.js and sclang.
    // This will give you an idea how the bridge operates.
    debug: true
  };

// This catches out of band errors:
// failures in supercolliderjs, the connection,
// your computer.
// Errors that occur outside of the
// interpret and response loop.
function onError(error) {
  console.error(error);
  console.trace();
  process.exit(1);
}

supercolliderjs.lang.boot(options)
  .then(function(sc) {

    function resultHandler(result) {
      console.log('Result:');
      console.log(result);
    }

    function errorHandler(error) {
      console.log('Error:');
      console.log(error);
    }

    // interpret and return result as promise
    sc.interpret('(1..8).pyramid')
      .then(resultHandler, errorHandler);

    // this will cause a syntax error
    // and call the errorHandler
    sc.interpret('1 + 1 oh no this is a syntax error')
      .then(resultHandler, errorHandler);

    // supercollider will throw a DoesNotUnderstand error
    // and the errorHandler here in javascript will get called
    sc.interpret('1 + 1.integerDoesntHaveThisMethod')
      .then(resultHandler, errorHandler);

  }, onError);
