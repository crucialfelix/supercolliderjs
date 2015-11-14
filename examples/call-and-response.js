/*
  Boot the local scsynth server,
  holding it as a spawned child process.

  next step: osc message to the server
*/

// In your project you will import it like this:
// var sc = require('supercolliderjs');

// From within this example folder I will import it using a relative path:
var sc = require('../index.js');

sc.server.boot({debug: true}).then(function(s) {
  var car = {
    call: ['/notify', 1],  // needs an id !
    response: ['/done', '/notify']
  };

  s.callAndResponse(car).then(function(e) {
    console.log('Server responds with your [clientID]:', e);
  });

  // fail, not registered
  // should watch for fails too if it matches your

}, console.error).done();
