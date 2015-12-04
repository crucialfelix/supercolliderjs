scsynth
=======

SuperCollider comes with an executable called scsynth which can be communicated with via udp OSC

Example::

  var sc = require('supercolliderjs');

  sc.server.boot().then(function(server) {
    // server is booted and connected ...
  });


The primary way to send messages in with send::

    server.send.msg(['/s_new', 'defName', 440]);

OSC responses are available as a subscribeable stream::

    server.receive.subscribe(function(msg) {
      console.log(msg);
    });

This is an Rx.Subject (reactive extensions)

They are also emitted with the key 'OSC' (though this will be deprecated and removed in 1.0)::

    server.on('OSC', function(msg) {
        // ...
    });


The server also offers structured call and response for async commands that the server responds to.::

      server.callAndResponse(sc.msg.status())
        .then(function(reply) {
          console.log(reply);
        });



Events
------

EventEmitter events are deprecated and will be removed in 1.0

Instead subscribe to the streams at::

    server.send.subscribe(function(event) { ... });
    server.receive.subscribe(function(event) { ... });
    sever.stdout.subscribe(function(event) { ... });
    server.processEvents.subscribe(function(event) { ... });


Server inherits from EventEmitter:

http://nodejs.org/api/events.html

So there is .on, .addListener, .removeListener, .once etc.

*    'out'   - stdout text from the server
*    'error' - stderr text from the server or OSC error messages
*    'exit'  - when server exits, crashes etc.
*    'close' - when server closes the UDP connection
*    'OSC'   - OSC responses from the server



Planned
-------

send.bundle will be implemented in 0.10.0
