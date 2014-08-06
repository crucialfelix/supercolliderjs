bin/supercollider-server
========================

This is a command wrapper for scsynth. When supercolliderjs is installed globally then this is available on your executable path.

Run scsynth (the supercollider synthesis server) using the configuration defined in the nearest .supercollider.yaml searching up from the current working directory.

Usage::

  supercollider-server [options]

Options::

    -h, --help           output usage information
    -V, --version        output the version number
    --config <path>      Configuration file eg. .supercollider.yaml
    --scsynth <path>     Path to scsynth executable
    --serverPort <port>  UDP port for the server to listen on
    -v, --verbose        Post debugging messages (default: false)


Examples::

    supercollider-server
    supercollider-server --config=/path/to/a/custom/config.yaml
    supercollider --scsynth=/path/to/scsynth


Planned features
----------------

Server options (num channels etc) will be loaded from the nearest .supercollider.yaml config file

`--forever` would run scsynth and restart it if it crashes.
