sclang
======

For use in node js projects, this starts a child process for sclang.

This is the same executable that the SC IDE launches and has the same capabilities (GUI, MIDI, OSC, Help file browser).

Example::

    var scjs = require('supercolliderjs');
    var SCLang = scjs.sclang;

    scjs.resolveOptions().then(function(options) {

      var sclang = new SCLang(options);

      sclang.boot()
        .then(function() {
          sclang.initInterpreter(function() {
            console.log('(1..8).pyramid');
            sclang.interpret('(1..8).pyramid')
              .then(function(result) {
                // JSON
                console.log('= ' + result);
              }, function(error) {
                console.log(error);
              });
          });
        });
    });


Methods
-------

constructor
+++++++++++

params: options

boot()
++++++

returns: promise

Example::

  sclang.boot().then(function() {
    // ready
    // ...
  }, function(error) {
    // process error (wrong path etc)
    // compilation error
    // failure during initClass startup
    console.log("Failed to boot:" + sclang.state);
  });

write(code, callback, noEcho)
+++++++++++++++++++++++++++++

Send a raw string to sclang to be interpreted.
Callback is called after write is complete but does not contain any response.

If noEcho is true then it will not print the input to log.stdin.

initInterpreter
+++++++++++++++

Prepare for using .interpret by having sclang execute the file: `lib/sc/interpret.scd` which installs functions used by the interpret method.

This is async

returns: promise


interpret(code, nowExecutingPath, asString)
+++++++++++++++++++++++++++++++++++++++++++

Evaluates code in sclang and returns a promise.

Resolves promise with result or rejects with error as JSON

This is a complete two-way bridge from javascript to supercollider.

Params::

    @param {string} code
           source code to evaluate
    @param {string} nowExecutingPath
             set thisProcess.nowExecutingPath
           for use in a REPL to evaluate text in a file
           and let sclang know what file it is executing.
    @param {Boolean} asString
           return result .asString for post window
           rather than as a full JSON object
    @returns {Promise}

Results are also returned as JSON unless asString is truthy. If the result of your code is an Array, Dictionary etc. it will be returned in the promise

Usage::

  lang.interpret('(1..4).pyramid')
    .then(function(result) {
      //javascript array: [ 1, 1, 2, 1, 2, 3, 1, 2, 3, 4 ]
    }, function(error) {

    });


Errors are returned as JSON. It does not yet send the backtrace (coming soon). This will be used by atom-supercollider to display structured and readable error results.

Example error object from sclang.interpret('1 + 1.pleaseDontDoThisToMe')
::

  { type: 'Error',
    error:
     { selector: 'pleaseDontDoThisToMe',
       what: 'DoesNotUnderstandError',
       args: [],
       receiver: { asString: '1', class: 'Integer' },
       class: 'DoesNotUnderstandError',
       path: '5f4b9581-1c83-11e4-bff4-77673f16fd9d',
       errorString: 'ERROR: Message \'pleaseDontDoThisToMe\' not understood by Integer 1' } }


Syntax errors are returned by not yet with all the information. The STDOUT needs to be parsed and converted into line/char and error messages.

quit
++++

Stop the child process with a SIGINT

returns: promise

Events
------

SCLang inherits from EventEmitter:

http://nodejs.org/api/events.html

So there is .on, .addListener, .removeListener, .once etc.

state
+++++

While booting it will emit various state changed events. The event will fire before it emits 'stdout'

- null - no child process
- 'booting' - process starting
- 'compiling' - process running, starting to compile class library
- 'compileError' - compilation failed due to a syntax error
- 'compiled' - compilation successful, running classInit and startup.scd
- 'ready' - Welcome to SuperCollider, I'm ready to take your order

example::

    l.on('state', function(state) {
        if(state === 'ready') {
            console.log("WELCOME");
        }
    });

stdout
++++++

Strings that sclang posts to STDOUT including all results of interpretation.

When using .interpret the response is returned by prepending a marker string and encoding the result or error. These responses are not echoed to stdout


stderr
++++++

sclang posts system level errors to STDERR such as child process error results (scsynth) and some occassional complaints about fonts. Syntax errors and sc code errors are not posted to STDERR.

exit
++++

On exit, close, disconnect or unexpected death of the child process.
