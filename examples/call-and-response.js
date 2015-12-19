#!/usr/bin/env node

// In your project you will import it like this:
// var sc = require('supercolliderjs');

// From within this example folder I will import it using a relative path:
var sc = require('../index.js');

sc.server.boot({debug: true}).then(function(server) {

  // sc.msg.status() returns this object:
  // {
  //   call: ['/status'],
  //   response: ['/status.reply']
  // }

  server.callAndResponse(sc.msg.status())
    .then(function(reply) {
      console.log(reply);
    });

});

/**
examples ❯ node call-and-response.js                                                                                                        ⏎
debug  : Start process: /Users/crucial/code/supercollider/build/Install/SuperCollider/SuperCollider.app/Contents/MacOS/scsynth -u 57110
debug  : pid: 32263
stdout : Number of Devices: 3
stdout :    0 : "Built-in Microph"
stdout :    1 : "Built-in Output"
stdout :    2 : "HDMI"
stdout : "Built-in Microph" Input Device
stdout :    Streams: 1
                 0  channels 2
stdout : "Built-in Output" Output Device
stdout :    Streams: 1
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
             0.7234667539596558,
             4.205343723297119,
             48000,
             47999.99999683723
           ]
[ 1,
  0,
  0,
  1,
  14,
  0.7234667539596558,
  4.205343723297119,
  48000,
  47999.99999683723 ]
**/
