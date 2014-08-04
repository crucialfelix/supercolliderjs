/*
  this just boots the local scsynth server,
  holding it as a spawned child process.

  next step: osc message to the server
*/

// npm install supercolliderjs
// then import like so:
// var scjs = require('supercolliderjs');

// from within this example folder this is the same thing:
var scjs = require('../index.js');
var Server = scjs.scsynth;

scjs.resolveOptions().then(function(options) {

  var s = new Server(options);

  s.boot();

  setTimeout(function() {
    s.connect();
    s.sendMsg('/notify', [1]);
    s.sendMsg('/status', []);
    s.sendMsg('/dumpOSC', []);

  }, 1000);

});
