Quick Start
===========

Install
-------

Install supercolliderjs globally by running::

    npm install -g supercolliderjs


Commands
--------

This will also install three commands to your executable path:

- supercollider
- bin-supercollider-server
- scapi


If you are using atom-supercollider then the latest supercolliderjs is installed with that, but not globally so the commands are not installed for you.



Node JS modules
---------------

To add to your node js project::

    npm install --save supercolliderjs

In your code require the package::

  var scjs = require('supercolliderjs');

  scjs.resolveOptions().then(function(options) {

    var SCLang = scjs.sclang;
    var lang = new SCLang(options);
    lang.boot();

    var Server = scjs.scsynth;
    var s = new Server(options);
    s.boot();

    var SCapi = scapi;
    var api = new SCapi(options);
    api.connect();

  });

See detailed documentation for each module.

- :doc:`sclang`
- :doc:`scsynth`
- :doc:`scapi`
- :doc:`bridge`
- :doc:`resolveOptions`
- :doc:`webserver`
