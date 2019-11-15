/* eslint no-console: 0 */
import chalk from "chalk";

const colors = {
  debug: "gray",
  error: "yellow",
  stdout: "green",
  stderr: "red",
  stdin: "blue",
  sendosc: "cyan",
  rcvosc: "magenta",
};

/**
 * A customized logging interface for supercollider.js
 *
 * Has special colors for osc messages and for logging stdin/stdout traffic.
 *
 * @example
 *
 *     log = new Logger(true, true);
 *
 *     log.dbug('a message');
 *     log.err('oh no');
 *     log.stdin('command that I sent')
 *     log.stdout('output from server')
 *     log.stderr('error from server')
 *
 */
export default class Logger {
  /**
   *Post all debugging calls to log.
   * If false then only errors are posted.
   *
   * @type {boolean}
   * @memberof Logger
   */
  private debug: boolean;
  /**
   * Echo stdin/stdout and osc traffic to console
   *
   * @type {boolean}
   * @memberof Logger
   */
  private echo: boolean;
  /**
   * Default is to use console.(log|error|info)
   *  but any object with a compatible API such
   *  as winston will work.
   */
  private log: Console;

  private colorize: boolean;
  private browser: boolean;

  constructor(debug = false, echo = false, log = console) {
    this.debug = debug;
    this.echo = echo;
    this.colorize = typeof log === "undefined";
    this.log = log;
    this.browser = typeof window !== "undefined";
  }

  /**
   * Log debugging information but only if this.debug is true
   */
  dbug(text: any) {
    if (this.debug) {
      this.print("debug  ", text, colors.debug);
    }
  }

  /**
   * Log an error.
   */
  err(text: any) {
    this.print("error  ", text, colors.error);
  }

  /**
   * Log messages that were sent to stdin or sclang.
   */
  stdin(text: any) {
    if (this.echo) {
      this.print("stdin  ", text, colors.stdin);
    }
  }

  /**
   * Log messages that were received from stdout of sclang/scsynth.
   */
  stdout(text: any) {
    if (this.echo) {
      this.print("stdout ", text, colors.stdout);
    }
  }

  /**
   * Log messages that were emitted from stderr of sclang/scsynth.
   */
  stderr(text: any) {
    if (this.echo) {
      this.print("stderr ", text, colors.stderr);
    }
  }

  /**
   * Log OSC messages sent to scsynth.
   */
  sendosc(text: any) {
    if (this.echo) {
      this.print("sendosc", text, colors.sendosc);
    }
  }

  /**
   * Log OSC messages received from scsynth.
   */
  rcvosc(text: any) {
    if (this.echo) {
      this.print("rcvosc ", text, colors.rcvosc);
    }
  }

  private print(label: string, text: any, color: string) {
    if (this.browser) {
      console.log("%c" + label, "font-size: 10px; color:" + color, text);
    } else {
      // terminal
      if (typeof text !== "string") {
        text = JSON.stringify(text, undefined, 2);
      }
      const lines = text.split("\n"),
        cleans = [label + ": " + lines[0]],
        rest = lines
          .slice(1)
          .filter((s: string) => s.length > 0)
          .map((s: string) => `        ${s}`);
      let clean = cleans.concat(rest).join("\n");
      if (this.colorize) {
        clean = chalk[color](clean);
      }

      switch (label.trim()) {
        case "debug":
        case "stdin":
        case "sendosc":
        case "rcvosc":
          this.log.info(clean);
          break;
        case "stderr":
        case "error":
          this.log.error(clean);
          break;
        default:
          this.log.info(clean);
      }
    }
  }
}
