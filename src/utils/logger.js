/* eslint no-console: 0 */

var chalk = require('chalk');

const c = {
  debug: 'gray',
  error: 'yellow',
  stdout: 'green',
  stderr: 'red',
  stdin: 'blue',
  sendosc: 'cyan',
  rcvosc: 'magenta'
};


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

export default class Logger {

  constructor(debug, echo) {
    this.debug = debug;
    this.echo = echo;
    this.browser = typeof window !== 'undefined';
  }

  dbug(text) {
    if (this.debug) {
      this.print('debug  ', text, c.debug);
    }
  }

  err(text) {
    this.print('error  ', text, c.error);
  }

  stdin(text) {
    if (this.echo) {
      this.print('stdin  ', text, c.stdin);
    }
  }

  stdout(text) {
    if (this.echo) {
      this.print('stdout ', text, c.stdout);
    }
  }

  stderr(text) {
    if (this.echo) {
      this.print('stderr ', text, c.stderr);
    }
  }

  sendosc(text) {
    if (this.echo) {
      this.print('sendosc', text, c.sendosc);
    }
  }

  rcvosc(text) {
    if (this.echo) {
      this.print('rcvosc ', text, c.rcvosc);
    }
  }

  print(label, text, color) {
    if (this.browser) {
      console.log('%c' + label, 'font-size: 10px; color:' + color, text);
    } else {
      // terminal
      if (typeof text !== 'string') {
        text = JSON.stringify(text, undefined, 2);
      }
      var
        lines = text.split('\n'),
        clean = [label + ': ' + lines[0]],
        rest = lines.slice(1),
        colorFn = chalk[color];
      rest = rest.filter(function(s) { return s.length > 0; });
      rest = rest.map(function(s) {
        return '           ' + s;
      });
      clean = clean.concat(rest);
      console.log(colorFn(clean.join('\n')));
    }
  }
}
