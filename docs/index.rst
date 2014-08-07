.. supercolliderjs documentation master file, created by
   sphinx-quickstart on Tue Aug  5 22:34:40 2014.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

supercollider.js
================

Node JS and webrowser tools for working with SuperCollider.

SuperCollider is an environment and programming language for real time audio synthesis and algorithmic composition. It provides an interpreted object-oriented language which functions as a network client to a state of the art, realtime sound synthesis server.

This library provides tools for working with:

- scsynth (the synthesis server)
- sclang (supercollider language interpreter)
- sclang running in SuperCollider application (IDE + sclang).


Features
--------

- Spawn headless SuperCollider language interpreters (sclang)
- Execute SuperCollider code from node js and get results or errors returned as JSON
- Spawn SuperCollider synthesis servers (scsynth)
- Send and receive OSC messages to scsynth
- Call API endpoints in SuperCollider from a browser using JavaScript and a websocket/OSC bridge
- Communicate with sclang running in SuperCollider.app (SC IDE) using OSC


Contribute
----------

- Issue Tracker: https://github.com/crucialfelix/supercolliderjs/issues
- Source Code: https://github.com/crucialfelix/supercolliderjs


License
-------

The project is licensed under the MIT license.


Docs
====

.. toctree::
   :maxdepth: 2

   quick-start
   configuration

   bin-supercollider
   bin-supercollider-server
   bin-scapi

   sclang
   scsynth
   scapi
   bridge
   webserver
   resolveOptions

   atom-supercollider

* :ref:`genindex`
* :ref:`search`
