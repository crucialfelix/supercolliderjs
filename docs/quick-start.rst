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
- supercollider-server
- scapi


If you are using atom-supercollider then the latest supercolliderjs is installed inside of that, you do not need to install this for atom to work. But supercolliderjs is not installed globally so if you want the command line commands then install this.



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
