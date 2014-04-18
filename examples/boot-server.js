/*
  this just boots the local scsynth server,
  holding it as a spawned child process.

  next step: osc message to the server
*/


var scsynth = require('../lib/nodejs/scsynth.js');
var options = require('../lib/nodejs/parse-options');


var s = new scsynth(options());


s.boot();

setTimeout(function() {

  s.connect();
  s.sendMsg('/notify', [1]);
  s.sendMsg('/status', []);
  s.sendMsg('/dumpOSC', []);

}, 1000);




// s.quit();
