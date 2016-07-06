/* eslint no-console: 0 */

var chalk = require('chalk');

const colors = {
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

  /**
   * @param {winston.Logger|undefined} log - optional external winston Logger or compatible API
   */
  constructor(debug, echo, log) {
    this.debug = debug;
    this.echo = echo;
    this.colorize = typeof log === 'undefined';
    this.log = log || console;
    this.browser = typeof window !== 'undefined';
  }

  dbug(text) {
    if (this.debug) {
      this.print('debug  ', text, colors.debug);
    }
  }

  err(text) {
    this.print('error  ', text, colors.error);
  }

  stdin(text) {
    if (this.echo) {
      this.print('stdin  ', text, colors.stdin);
    }
  }

  stdout(text) {
    if (this.echo) {
      this.print('stdout ', text, colors.stdout);
    }
  }

  stderr(text) {
    if (this.echo) {
      this.print('stderr ', text, colors.stderr);
    }
  }

  sendosc(text) {
    if (this.echo) {
      this.print('sendosc', text, colors.sendosc);
    }
  }

  rcvosc(text) {
    if (this.echo) {
      this.print('rcvosc ', text, colors.rcvosc);
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
        rest = lines.slice(1)
          .filter((s) => s.length > 0)
          .map((s) => '           ' + s);
      clean = clean.concat(rest).join('\n');
      if (this.colorize) {
        clean = chalk[color](clean);
      }

      switch (label.trim()) {
        case 'debug':
        case 'stdin':
        case 'sendosc':
        case 'rcvosc':
          this.log.info(clean);
          break;
        case 'stderr':
        case 'error':
          this.log.error(clean);
          break;
        default:
          this.log.info(clean);
      }
    }
  }
}
