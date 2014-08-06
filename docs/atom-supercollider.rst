atom-supercollider
==================

https://github.com/crucialfelix/atom-supercollider

atom-supercollider is powered by supercolliderjs. The interpreter, process and error handling are all done here in supercolliderjs.

This means that atom-supercollider focuses on things to do with the Atom editor and interface, and supercolliderjs focuses on working with sclang and scsynth.

Other IDEs could also use this, and this package could also be used to embed SuperCollider REPLs in other projects.


paths and config
----------------

If you are using the .supercollider.yaml config feature in atom-supercollider then you may wish to later run that code outside of Atom.

Install supercolliderjs globally and use the supercollider command::

    supercollider my-piece.scd

Paths and configuration settings will be identical inside or outside of atom.
If you wish to switch easily back and forth with the SC IDE then you may wish to do your config using startup.scd and sclang_conf.yaml
