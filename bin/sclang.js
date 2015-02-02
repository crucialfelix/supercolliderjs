#!/usr/bin/env node
//
var help = [
  'Run sclang (the supercollider language interpreter) using the configuration defined in the nearest .supercollider.yaml searching up from the current working directory.',
  '',
  'By default evaluates STDIN and posts to STDOUT. This is a simple command line repl without multi-line support.',
  '',
  'package.json specifies this as an executable with the name of "supercollider" so installing supercollider.js with the global flag will add this to your shell executable path.',
  '',
  'Examples:',
  '',
  'supercollider',
  'supercollider run-this-file.scd',
  'supercollider --config=/path/to/a/custom/config.yaml',
  'supercollider --stdin=false --echo=false --sclang=/path/to/sclang',
  ''
];

var
    join = require('path').join,
    pkg = require(join(__dirname, '../package.json')),
    lib = join(__dirname, '../lib/nodejs/'),
    program = require('commander'),
    resolveOptions = require('../lib/nodejs/resolveOptions'),
    SCLang = require(lib + 'sclang'),
    options = {};

function truthy(input) {
  return (input + '') !== 'false';
}

program.version(pkg.version)
  .option('--config <path>', 'Configuration file eg. .supercollider.yaml')
  .option('--sclang <path>', 'Path to sclang executable')
  .option('--langPort <port>', 'UDP port for the interpreter to listen on')
  .option('--stdin <bool>', 'Interpret STDIN (default: true)', truthy, true)
  .option('--echo <bool>', 'Echo STDIN to STDOUT (default: true)', truthy, true)
  .option('-v, --verbose', 'Post debugging messages (default: false)',
    truthy, false);

program.on('--help', function() {
  help.forEach(function(line) {
    console.info('    ' + line);
  });
});

program.parse(process.argv);

['config', 'sclang', 'langPort', 'stdin', 'echo', 'verbose'].forEach(
  function(k) {
    if (k in program) {
      options[k] = program[k];
    }
  });

// pass a filename for sclang to execute
if (program.args.length) {
  options.executeFile = program.args[0];
}

resolveOptions(options.config, options).then(function(options) {

  var l = new SCLang(options);

  l.boot();

  l.on('exit', function() {
    console.warn('sclang exited');
    console.info(options);
    process.exit(1);
  });

}, function(err) {
  console.error(err);
  process.exit(1);
});

// forever: automatically reboot if sclang crashes
// else: should exit when sclang exits
