resolveOptions
==============

Loads configs for scsynth and sclang

Looks for '.supercollider.yaml' starting from current working directory.

see :doc:`configuration`


Usage::

  var scjs = require('supercolliderjs');

  // search for .supercollider.yaml
  scjs.resolveOptions().then(function(options) {
    console.log(options);
  });

  // load an explicit config file
  scjs.resolveOptions('path/to/config.yaml').then(function(options) {
    console.log(options);
  });

  // overide some loaded options
  scjs.resolveOptions(null, {
    langPort: 8000
  }).then(function(options) {
    console.log(options);
  });

Since file loading in nodejs is async, it returns a promise
