CHANGELOG
=========

0.4.0
-----

- config file renamed from .supercolliderjs to .supercollider.yaml
- executables renamed so as not to shadow real ones: sclang -> supercollider, scsynth -> supercollider-server
- added sclang-interpret
- sclang emits 'state' change events: booting, compiling, compileError, compiled, ready
- wrote documentation


0.4.1
-----

- fix incorrect bin paths in package.json
- fixed interpreter for 3.6.6 which always requires terminating \n


0.4.9
-----

- FEAT: pass large javascript objects, arrays in multiple requests to keep below the UDP packet limit
