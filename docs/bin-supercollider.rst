bin/supercollider
=================

When supercolliderjs is installed globally then this is available on your executable path.

This is a command wrapper for sclang (the supercollider language interpreter) using the configuration defined in the nearest .supercollider.yaml searching up from the current working directory.

Usage::

  supercollider [options]

Options::

  -h, --help         output usage information
  -V, --version      output the version number
  --config <path>    Configuration file eg. .supercollider.yaml
  --sclang <path>    Path to sclang executable
  --langPort <port>  UDP port for the interpreter to listen on
  --stdin <bool>     Interpret STDIN (default: true)
  --echo <bool>      Echo STDIN to STDOUT (default: true)
  -v, --verbose      Post debugging messages (default: false)

By default evaluates STDIN and posts to STDOUT. This is a simple command line repl without multi-line support.

Examples::

    supercollider
    supercollider run-this-file.scd
    supercollider --config=/path/to/a/custom/config.yaml
    supercollider --stdin=false --echo=false --sclang=/path/to/sclang

.. image:: images/sclang.png


Planned features
----------------

`--forever` would run sclang and restart it if it crashes. forever.
