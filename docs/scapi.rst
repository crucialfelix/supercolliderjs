scapi
=====

Run either the full Super Collider app or a headless sclang and call API functions using the API quark.

https://github.com/crucialfelix/API

Results are returned via callbacks or promises.::

  var SCAPI = require('supercolliderjs').scapi;
  var scapi = new SCAPI();
  scapi.connect();
  // call registered API functions with a callback
  scapi.call('api.apis', [], function(response) {
    console.log(response);
  });
  // You can interpret code or execute files.
  scapi.call('interpreter.interpret', ["1 + 1"])
    // .call returns a Q promise
    .then(function(result) {
        console.log(result);  // integer 2
      }, function(err) {
        console.log("ERROR:" + err);
      });


API Quark
---------

First install the API quark

In SuperCollider::

  Quarks.install("API");

Enable the OSC bridge in SuperCollider::

  API.mountDuplexOSC;

You could add this to your startup.scd file


You can easily write APIs for your own application just by putting a file containing a dictionary of handlers in::

    {yourquark}/apis/{apiname}.api.scd

Example server.api.scd::

    (
      boot: { arg reply, name=\default;
        Server.fromName(name).waitForBoot(reply, 100, {
          Error("Server failed to boot").throw
        });
      }
    )
