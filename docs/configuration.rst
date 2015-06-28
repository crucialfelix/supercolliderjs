Configuration
=============

An optional config file specifies the paths to the sclang and scsynth executables. If not found then it assumes that SuperCollider is installed in the standard place for your platform. It should just work.
You only need to make a configuration file if it doesn't.

Searches for the first found of:

* .supercollider.yaml
* ~/.supercollider.yaml

If its not finding the sclang you want to use then you can write a config file.

The binaries (supercollider, supercollider-server and scapi) can also take an explicit config to load: `--config=/path/to/conf.yaml`

~ (tilde) and relative paths are resolved to absolute paths
The tilde should work on Windows.


settings and defaults
---------------------

supercollider js needs to be pointed to the sclang binary and to the sclang configuration file.

The simplest configuration would be:

~/.supercollider.yaml::

    sclang: /Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang
    sclang_conf: ~/Library/Application Support/SuperCollider/sclang_conf.yaml

Adjust those paths for linux or windows.

A full configuration would be:

~/.supercollider.yaml::

    sclang: /Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang
    scsynth: /Applications/SuperCollider/SuperCollider.app/Contents/MacOS/scsynth
    sclang_conf: ~/Library/Application Support/SuperCollider/sclang_conf.yaml
    debug: true
    echo: true
    stdin: true
    langPort: 57120
    serverPort: 57110
    host: 127.0.0.1
    protocol: udp
    websocketPort: 4040


YAML format
-----------

http://www.yaml.org/start.html
http://en.wikipedia.org/wiki/YAML#Sample_document


Usual locations of sclang
-------------------------

These are the defaults

OS X::

    /Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang

Linux::

    /usr/bin/local/sclang

Windows::

    C:\Program Files (x86)\SuperCollider\sclang.exe


.supercollider.yaml and sclang_config.yaml
------------------------------------------

An sclang_conf.yaml is generated dynamically and passed as a command line argument to sclang.

The following variables are copied from .supercollider.yaml into the dynamically created sclang_conf.yaml::

    includePaths
    excludePaths
    postInlineWarnings

When you install Quarks using the new Quarks system (3.7 development) these are added to the includePaths of your sclang_conf.yaml

If your .supercollider.yaml file specifies the path to your sclang_conf then it will load that sclang_conf and merge the includePaths and excludePaths with the dynamic ones.

There are several benefits to doing this.

- You can maintain a single config file
- Use relative paths and ~ in paths
- Easily include local project paths into the compilation

This means you can keep your classes anywhere you like without having to put them in Extensions.

On OS X the Extensions folder and config folder are now in ~/Library/Application Support/SuperCollider which is now invisible to the Finder.
This (IMO) is no longer a user friendly place to keep user files.
