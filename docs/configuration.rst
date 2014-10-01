Configuration
=============

An optional config file specifies the paths to the sclang and scsynth executables. If not found then it assumes that SuperCollider is installed in the standard place for your platform. It should just work.

Searches for the first found of:

* .supercollider.yaml
* ~/.supercollider.yaml

If its not finding the sclang you want to use then you can write a config file.

The binaries (supercollider, supercollider-server and scapi) can also take an explicit config to load: `--config=/path/to/conf.yaml`

~ (tildas) and relative paths are resolved to absolute paths


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

The only one you need to specify normally is sclang.

YAML format
-----------

http://www.yaml.org/start.html
http://en.wikipedia.org/wiki/YAML#Sample_document


Usual locations of sclang
-------------------------

These are the defaults

OS X::

    /Applications/SuperCollider/SuperCollider.app/Contents/Resources/sclang

Linux::

    /usr/bin/local/sclang

Windows::

    C:\Program Files (x86)\SuperCollider\sclang.exe




sclang_config.yaml
------------------

An sclang_conf.yaml is generated on the fly and passed to sclang.

The following variables are copied from .supercollider.yaml into the dynamically created sclang_conf.yaml::

    includePaths
    excludePaths
    postInlineWarnings

There are several benefits to doing this.

- You can maintain a single config file
- Use relative paths and ~ in paths
- Easily include local project paths into the compilation

This means you can keep your classes anywhere you like without having to put them in Extensions.

On OS X the Extensions folder and config folder are now in ~/Library/Application Support/SuperCollider which is now invisible to the Finder. This (IMO) is no longer a user friendly place to keep user files.


previous versions
-----------------

supercolliderjs 0.3.x used a JSON file called .supercolliderjs

YAML is nicer for humans.

Format thrashing is annoying for humans. Sorry.
