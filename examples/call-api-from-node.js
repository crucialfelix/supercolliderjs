
/*
  Example usage in a node-js app to call supercollider API functions

  Start SuperCollider
  Install the API quark ( > 2.0 )
  Activate the OSC responders in supercollider:
    API.mountDuplexOSC

*/


// npm install supercolliderjs
// then import like so:
// var scjs = require('supercolliderjs');

// from within this example folder this is the same thing:
var scjs = require('../index.js');

var SCAPI = scjs.scapi;

scjs.resolveOptions().then(function(options) {

  var scapi = new SCAPI(options);
  scapi.connect();

  // simple API call with a callback
  scapi.call('api.apis', [], function(response) {
    console.log(response);
  });


  // with ok and error callback
  scapi.call('nope.wrong.address', [], function(response) {
    console.log(response);
  }, function(err) {
    console.log('err: ', err);
  });


  // call returns a Q promise
  // so you can use .then
  scapi.call('instr.list')
    .then(function(response) {
      console.log(response.result);
    }, function(err) {
      console.log(err);
    });

});
