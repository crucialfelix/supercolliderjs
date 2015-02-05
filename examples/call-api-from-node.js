/*
  Example usage in a node-js app to call supercollider API functions

  Start SuperCollider
  Install the API quark ( > 2.0 )
  Activate the OSC responders in supercollider:
    API.mountDuplexOSC

*/

// usually you have installed supercolliderjs
// so in your node scripts you import it this way:
// var scjs = require('supercolliderjs');

// but if you are running this from inside this example folder
// then let's import from a relative path
// index.js exports an object containing the supercollider.js modules
var scjs = require('../index.js');

// the SCAPI class is accessibl as .scapi
var SCAPI = scjs.scapi;

scjs.resolveOptions().then(function(options) {

  var scapi = new SCAPI(options.host, options.langPort);
  // scapi comes with a logger utility
  // which is nicer than console.log
  // because it dumps objects and formats them
  // see Logger
  scapi.log.dbug(options);

  scapi.connect();

  // simple API call with a callback
  scapi.call(0, 'API.apis', [])
    .then(function(response) {
      scapi.log.rcvosc(response);
    }, function(err) {
      scapi.log.err(err);
    });

  // with ok and error callback
  scapi.call(1, 'nope.wrong.address', [])
    .then(function(response) {
      scapi.log.rcvosc(response);
    }, function(err) {
      scapi.log.err(err);
    });

  // call returns a Q promise
  // so you can use .then
  scapi.call(2, 'instr.list')
    .then(function(response) {
      scapi.log.rcvosc(response.result);
    }, scapi.log.err);

});
