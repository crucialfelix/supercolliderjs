
var colors = require('colors'),
    _ = require('underscore');

colors.setTheme({
  debug: 'grey',
  error: 'magenta',
  stdout: 'green',
  stderr: 'red',
  stdin: 'cyan'
});


/**
 * usage:
 *
 * log = new Logger(true, true);
 *
 * log.dbug('a message');
 * log.err('oh no');
 * log.stdin('command that I sent')
 * log.stdout('output from server')
 * log.stderr('error from server')
 *
 */
var Logger = function(debug, echo) {
  this.debug = debug;
  this.echo = echo;
};


Logger.prototype.dbug = function(text) {
  if(this.debug) {
    this.print('  debug  - '.debug, text);
  }
};


Logger.prototype.err = function(text) {
  this.print('  error  - '.error, text);
};


Logger.prototype.stdin = function(text) {
  if(this.echo) {
    this.print('  stdin  - '.stdin, text);
  }
};


Logger.prototype.stdout = function(text) {
  if(this.echo) {
    this.print('  stdout - '.stdout, text);
  }
};


Logger.prototype.stderr = function(text) {
  if(this.echo) {
    this.print('  stderr - '.stderr, text.stderr);
  }
};


Logger.prototype.print = function(label, text) {
  var
    lines = text.split('\n'),
    clean = [label + lines[0]],
    rest = lines.slice(1),
    indent = label.length;
  clean = clean.concat(rest.map(function(s) {
    return '           ' + s;
  }));
  console.log(clean.join('\n'));
};


module.exports = Logger;
