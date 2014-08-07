Configuration
=============

An optional config file specifies the paths to the sclang and scsynth executables. If not found then it assumes that SuperCollider is installed in the standard place for your platform. It should just work.

Searches upwards from current working directory:

* .supercollider.yaml
* ~/.supercollider.yaml

Matching config files in child directories are shallow merged into config files found in parent directories.

This means you can create your personal default `~/.supercollider.yaml` and then create a local project specific `./.supercollider.yaml` that inherits from it.

The binaries (supercollider, supercollider-server and scapi) can also take an explicit config to load: `--config=/path/to/conf.yaml`

~ are resolved to absolute paths


settings and defaults
---------------------

~/.supercollider.yaml::

    sclang: /Applications/SuperCollider/SuperCollider.app/Contents/Resources/sclang
    scsynth: /Applications/SuperCollider/SuperCollider.app/Contents/Resources/scsynth
    debug: true
    echo: true
    stdin: true
    langPort: 57120
    serverPort: 57110
    host: 127.0.0.1
    protocol: udp
    websocketPort: 4040


On linux: /usr/bin/local/sclang

http://www.yaml.org/start.html
http://en.wikipedia.org/wiki/YAML#Sample_document


planned
-------

Specify sc class paths.

- includePaths
- excludePaths

An sclang_conf.yaml will be generated on the fly and passed to sclang.  Will support relative paths and ~

This would make it much easier to write classes and simply use them from your current directory without having to install them in the global Extensions.

Would also enable installing quarks to a local folder just for a single project, and for easily running downloaded examples that use custom classes and quarks. No need to install and uninstall anything, just run the code from within the source directory.

paths and config
----------------

If you wish to switch easily back and forth with the SC IDE then you may wish to continue to do your config using startup.scd and sclang_conf.yaml and avoid new fancy features for a bit.

stability
---------

beta. things will change but will eventually be guaranteed stabile.

previous versions
-----------------

supercolliderjs 0.3.x used a JSON file called .supercolliderjs

YAML is nicer for humans. Format thrashing is annoying for humans. Sorry.
