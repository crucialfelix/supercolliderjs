#!/usr/bin/env node

// In your project you will import it like this:
// var sc = require('supercolliderjs');

// From within this example folder I will import it using a relative path:
var sc = require('../index.js');

sc.server.boot().then(function(s) {
  s.send.msg(sc.msg.dumpOSC(1));

  function spawnGroup() {
    s.send.bundle(0.03, [
      sc.msg.groupNew(s.state.nextNodeID())
    ]);
  }

  setInterval(spawnGroup, 2000);

});
