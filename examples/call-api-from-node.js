#!/usr/bin/env node

/*
  Example usage in a node-js app to call supercollider API functions

  Start SuperCollider
  Install the API quark ( >= 2.0.2 )
  Activate the OSC responders in supercollider:
    API.mountDuplexOSC

*/

// usually you have installed supercolliderjs
// so in your node scripts you import it this way:
// var supercolliderjs = require('supercolliderjs');

// but if you are running this from inside this example folder
// then let's import from a relative path
// index.js exports an object containing the supercollider.js modules
var sc = require('../index.js');

// the SCAPI class is accessibl as .scapi
var SCAPI = sc.scapi;

sc.resolveOptions().then(function(options) {

  var scapi = new SCAPI(options.host, options.langPort);
  // scapi comes with a logger utility
  // which is nicer than console.log
  // because it dumps objects and formats them
  // see Logger
  scapi.log.dbug(options);

  scapi.connect();

  // call returns a Promise
  // so you use .then(ok, error)
  scapi.call(0, 'API.apis', [])
    .then(function(response) {
      scapi.log.dbug(response);
    }, function(err) {
      scapi.log.err(err);
    });
  // note: check your version of API quark is >= 2.0.2
  // previous versions had registered it as lower case: 'api.apis'

  // also read about Q so you can chain promises
  // and return new promises from your ok function.

  // This one will throw an error.
  // scapi.log.err will post the json error object to the console in red
  scapi.call(1, 'nope.wrong.address', [])
    .then(function(response) {
      scapi.log.dbug(response);
    }, function(err) {
      scapi.log.err(err);
    });

  scapi.call(2, 'server.boot')
    .then(function() {
      scapi.log.dbug('server booted');
      return scapi.call(3, 'group.new')
        .then(function(response) {
          scapi.log.debug(response);
        });
    });

});
