#!/usr/bin/env node

var help = [
  'Export a copy of scsynth for use as a standalone.'
];

// TODO sclang and all classfiles

var path = require('path');
var join = path.join;
var pkg = require(join(__dirname, '../package.json'));
var fs = require('fs');
var ncp = require('ncp').ncp;
var lib = join(__dirname, '../lib/js/');
var program = require('commander');
var resolveOptions = require(lib + 'resolveOptions');
var Server = require(lib + 'scsynth');
var Q = require('q');

function makeDir(dest) {
  if (fs.existsSync(dest)) {
    return Q();
  }
  return Q.nfapply(fs.mkdir, [dest]);
}

function makeExecScript(source, dest) {
  var execScript = [
    '#!/bin/bash',
    'DIR="${BASH_SOURCE%/*}";',
    'if [[ -z "$@" ]]; then',
    '  ARGS="-u 57110";',
    'else',
    '  ARGS="$@";',
    'fi',
    'if [[ -z "$SC_SYNTHDEF_PATH" ]]; then',
    '  export SC_SYNTHDEF_PATH="$DIR/synthdefs/"',
    'fi',
    'export SC_PLUGIN_PATH="$DIR/plugins/";',
    'exec "$DIR/bin/scsynth" $ARGS;'
  ];

  if (fs.exists(dest)) {
    return Q();
  }
  return Q.nfapply(fs.writeFile, [
    dest,
    execScript.join('\n'),
    {
      mode: 0755
    }
  ]);
}

function exportScsynth(dest) {
  return resolveOptions().then(function(options) {
    if (!fs.existsSync(dest)) {
      return Q.reject('Destination directory does not exist' + dest);
    }
    return makeDir(join(dest, 'bin')).then(function() {
      var destScsynth = join(dest, 'bin', 'scsynth');
      var srcPlugins = join(path.dirname(options.scsynth),
        '..', 'Resources', 'plugins');
      return Q.all([
        Q.nfcall(ncp, options.scsynth, destScsynth),
        Q.nfcall(ncp, srcPlugins, join(dest, 'plugins')),
        makeDir(join(dest, 'synthdefs'))
      ]).then(function() {
        return makeExecScript(destScsynth, join(dest, 'scsynth'));
      });
    });
  });
}

program
  .command('scsynth <dest>')
  .description('Copy scsynth and plugins to the destination directory')
  .action(function(dest) {
    exportScsynth(path.resolve(dest))
      .then(function() {
        console.log('Finished');
      }, function(err) {
        throw Error(err);
      }).done();
  });

program.on('--help', function() {
  help.forEach(function(line) {
    console.info('    ' + line);
  });
});

program.version(pkg.version).parse(process.argv);
