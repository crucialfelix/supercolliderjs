
/*
  Example usage in a node-js app to call supercollider API functions

  Start SuperCollider
  Install the API quark ( > 2.0 )
  Activate the OSC responders in supercollider:
    API.mountDuplexOSC

*/


var SCAPI = require('../lib/nodejs/scapi.js');

var scapi = new SCAPI();
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

