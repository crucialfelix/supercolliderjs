#!/usr/bin/env node
/* eslint no-console: 0 */
var help = ['Export a copy of scsynth for use as a standalone.'];

// TODO sclang and all classfiles

var path = require('path');
var join = path.join;
var fs = require('fs');
var ncp = require('ncp').ncp;
var program = require('commander');
var Promise = require('bluebird');

var pkg = require(join(__dirname, '../package.json'));
var sc = require(join(__dirname, '../index'));
var resolveOptions = sc.resolveOptions;

function makeDir(dest) {
  if (fs.existsSync(dest)) {
    return Promise.resolve();
  }
  return Promise.fromCallback(callback => {
    fs.mkdir(dest, callback);
  });
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
    return Promise.resolve();
  }
  return Promise.fromCallback(callback => {
    fs.writeFile(dest, execScript.join('\n'), { mode: '0755' }, callback);
  });
}

function exportScsynth(dest) {
  return resolveOptions().then(function(options) {
    if (!fs.existsSync(dest)) {
      return Promise.reject(
        new Error('Destination directory does not exist:' + dest)
      );
    }
    return makeDir(join(dest, 'bin')).then(function() {
      var destScsynth = join(dest, 'bin', 'scsynth');
      var srcPlugins = join(
        path.dirname(options.scsynth),
        '..',
        'Resources',
        'plugins'
      );
      var ncpp = Promise.method(ncp);

      return Promise.all([
        ncpp(options.scsynth, destScsynth),
        ncpp(srcPlugins, join(dest, 'plugins')),
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
      .then(
        function() {
          console.log('Finished');
        },
        function(err) {
          throw new Error(err);
        }
      )
      .done();
  });

program.on('--help', function() {
  help.forEach(function(line) {
    console.info('    ' + line);
  });
});

program.version(pkg.version).parse(process.argv);
