
var colors = require('colors'),
    _ = require('underscore');

colors.setTheme({
  debug: 'grey',
  error: 'magenta',
  stdout: 'green',
  stderr: 'red',
  stdin: 'blue',
  sendosc: 'cyan',
  rcvosc: 'yellow'
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
  if (this.debug) {
    this.print('  debug  - '.debug, text);
  }
};

Logger.prototype.err = function(text) {
  this.print('  error  - '.error, text);
};

Logger.prototype.stdin = function(text) {
  if (this.echo) {
    this.print('  stdin  - '.stdin, text.stdin);
  }
};

Logger.prototype.stdout = function(text) {
  if (this.echo) {
    this.print('  stdout - '.stdout, text);
  }
};

Logger.prototype.stderr = function(text) {
  if (this.echo) {
    this.print('  stderr - '.stderr, text.stderr);
  }
};

Logger.prototype.sendosc = function(text) {
  if (this.echo) {
    this.print('  sendosc - '.sendosc, text.sendosc);
  }
};

Logger.prototype.rcvosc = function(text) {
  if (this.echo) {
    console.log('  rcvosc  - '.rcvosc, text);
  }
};

Logger.prototype.print = function(label, text) {
  if (typeof text !== 'string') {
    text = JSON.stringify(text);
  }
  var
    lines = text.split('\n'),
    clean = [label + lines[0]],
    rest = lines.slice(1);
  rest = rest.filter(function(s) { return s.length > 0; });
  rest = rest.map(function(s) {
    return '           ' + s;
  });
  clean = clean.concat(rest);
  console.log(clean.join('\n'));
};

module.exports = Logger;
