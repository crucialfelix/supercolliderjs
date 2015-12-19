#!/usr/bin/env node

// Usually in your project you would import like this:
// var sc = require('supercolliderjs');
// From within this example folder I import using a relative path
var sc = require('../index.js');

sc.lang.boot({debug: false}).then(function(sclang) {

  sclang.interpret('1 + 1').then(function(answer) {
    console.log('1 + 1 = ' + answer);
  }, console.error);

});
