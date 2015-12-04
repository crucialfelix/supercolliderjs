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

- Start SuperCollider language interpreters (sclang)
- Interpret SuperCollider code from node js and get results or errors returned as equivalent JavaScript types

- Start SuperCollider synthesis servers (scsynth)
- Send and receive OSC messages to scsynth
- Call async commands on scsynth and receive results
- Comprehensive library for calling all commands the server understands
- Node-id/Bus/Buffer allocators
- Server state and synth/group tracking


API
---

https://doc.esdoc.org/github.com/crucialfelix/supercolliderjs/



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

   sclang
   scsynth
   scapi
   resolveOptions

   atom-supercollider
   CHANGELOG

* :ref:`genindex`
* :ref:`search`
