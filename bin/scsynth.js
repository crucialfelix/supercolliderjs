#!/usr/bin/env node
/* eslint no-console: 0 */
var help = [
  'Run scsynth (the supercollider synthesis server) using the configuration defined in the nearest .supercollider.yaml searching up from the current working directory.',
  '',
  '',
  'Examples:',
  '',
  'supercollider-server',
  'supercollider-server --config=/path/to/a/custom/config.yaml',
  'supercollider --scsynth=/path/to/scsynth',
  ''
];

var
    join = require('path').join,
    program = require('commander');

var pkg = require(join(__dirname, '../package.json'));
var sc = require(join(__dirname, '../index'));
var resolveOptions = sc.resolveOptions;
var Server = sc.server.Server;
var options = {};

function truthy(input) {
  return (input + '') !== 'false';
}

program.version(pkg.version)
  .option('--config <path>', 'Configuration file eg. .supercollider.yaml')
  .option('--scsynth <path>', 'Path to scsynth executable')
  .option('--serverPort <port>', 'UDP port for the server to listen on')
  .option('-v, --verbose', 'Post debugging messages (default: false)',
    truthy, false);

program.on('--help', function() {
  help.forEach(function(line) {
    console.info('    ' + line);
  });
});

program.parse(process.argv);

['config', 'scsynth', 'serverPort', 'verbose'].forEach(function(k) {
  if (k in program) {
    options[k] = program[k];
  }
});

resolveOptions(options.config, options).then(function(opts) {

  var s = new Server(opts);

  s.boot();

  s.on('exit', function() {
    console.warn('scsynth exited');
    console.info(options);
    process.exit(1);
  });

}, function(err) {
  console.error(err);
  process.exit(1);
});
