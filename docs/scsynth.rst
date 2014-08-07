scsynth
=======

SuperCollider comes with an executable called scsynth which can be communicated with via udp OSC

The primary way to send messages in with sendMsg::

  server.sendMsg('/s_new', ['defName', 440]);

and the responses are emitted as 'OSC'::

    server.on('OSC', function(msg) {
        // ...
    });


Example::

  var scjs = require('supercolliderjs');

  scjs.resolveOptions().then(function(options) {

    var Server = require('supercolliderjs').scsynth;
    var s = new Server(options);
    s.boot();

    // wait for it to boot
    // TODO: return a promise
    setTimeout(function() {
      s.connect();
      s.sendMsg('/notify', [1]);
      s.sendMsg('/status', []);
      s.sendMsg('/dumpOSC', []);
    }, 1000);

    s.on('OSC', function(addr, msg) {
      // message from the server
      console.log(addr + msg);
    });

  });

Methods
-------

constructor
+++++++++++

boot
++++

quit
++++

connect
+++++++
OSC connect via UDP

disconnect
++++++++++
OSC disconnect

sendMsg
+++++++

Usage::

    s.connect();
    s.sendMsg('/notify', [1]);


Events
------

SCLang inherits from EventEmitter:

http://nodejs.org/api/events.html

So there is .on, .addListener, .removeListener, .once etc.

*    'out'   - stdout text from the server
*    'error' - stderr text from the server or OSC error messages
*    'exit'  - when server exits, crashes etc.
*    'close' - when server closes the UDP connection
*    'OSC'   - OSC responses from the server



Planned
-------

sendBundle is not yet implemented

`--forever` to always restart server if it crashes
