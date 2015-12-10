#!/usr/bin/env node

/**
 * a less verbose way to boot up sclang
 * and intepret sc code
 */

// var supercolliderjs = require('supercolliderjs');
var supercolliderjs = require('../index.js');
var options = {
    // no STDIN, all input will be programmatic
    stdin: false,
    echo: false,
    // turn debug on if you want to see all stdout posted to the console
    debug: false
  };

// this catches out of band errors:
// failures in supercolliderjs, the connection,
// your computer
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
