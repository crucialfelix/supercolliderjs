#!/usr/bin/env node

/*

This example shows the low-level function server.oscOnce

See call-and-response.js for a higher level interface for async calls.
*/

// In your project you will import it like this:
// var sc = require('supercolliderjs');

// From within this example folder I will import it using a relative path:
var sc = require('../index.js');

sc.server.boot().then(function(s) {

  // register a one-time handler that matches /status.reply
  s.oscOnce(['/status.reply']).then(function(e) {
    console.log('osconce reply', e);
  });

  // send the msg that will trigger the reply
  s.send.msg(['/status']);
});

/**
examples ❯ node osc-once.js                                                                                                                 ⏎
debug  : Start process: /Users/crucial/code/supercollider/build/Install/SuperCollider/SuperCollider.app/Contents/MacOS/scsynth -u 57110
debug  : pid: 32397
stdout : Number of Devices: 3
stdout :    0 : "Built-in Microph"
stdout :    1 : "Built-in Output"
stdout :    2 : "HDMI"
stdout : "Built-in Microph" Input Device
stdout :    Streams: 1
                 0  channels 2
stdout : "Built-in Output" Output Device
              Streams: 1
                 0  channels 2
stdout : SC_AudioDriver: sample rate = 48000.000000, driver's block size = 512
stdout : PublishPortToRendezvous 0 5855
           SuperCollider 3 server ready.
sendosc: /notify 1
debug  : udp is listening
rcvosc : [
             "/done",
             "/notify",
             0
           ]
sendosc: /status
rcvosc : [
             "/status.reply",
             1,
             0,
             0,
             1,
             14,
             0.050619468092918396,
             0.3884156346321106,
             48000,
             48000.000005743
           ]
osconce reply [ 1,
  0,
  0,
  1,
  14,
  0.050619468092918396,
  0.3884156346321106,
  48000,
  48000.000005743 ]
**/
