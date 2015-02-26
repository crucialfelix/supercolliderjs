resolveOptions
==============

Loads configs for scsynth and sclang from a yaml file

Tries in order::

    .supercollider.yaml
    ~/.supercollider.yaml

and merges those on top of the defaults.

If these are not found the it uses only the defaults


see :doc:`configuration`


Usage::

  var supercolliderjs = require('supercolliderjs');

  // search for .supercollider.yaml
  supercolliderjs.resolveOptions().then(function(options) {
    console.log(options);
  });

  // load an explicit config file
  supercolliderjs.resolveOptions('path/to/config.yaml').then(function(options) {
    console.log(options);
  });

  // overide some loaded options
  supercolliderjs.resolveOptions(null, {
    langPort: 8000
  }).then(function(options) {
    console.log(options);
  });

Since file loading in nodejs is async, it returns a promise
