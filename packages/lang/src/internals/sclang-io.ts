import { EventEmitter } from "events";
import _ from "lodash";

import { SCLangError } from "../Errors";

type JSONObjectType = object;

export enum State {
  NULL = "null",
  BOOTING = "booting",
  COMPILED = "compiled",
  COMPILING = "compiling",
  COMPILE_ERROR = "compileError",
  READY = "ready",
}

export class SclangCompileResult {
  version = "";
  stdout = "";
  errors: CompileError[] = [];
  extensionErrors: ExtensionError[] = [];
  duplicateClasses: DuplicateClass[] = [];
  dirs: string[] = [];
}

interface CompileError {
  msg: string;
  file: string;
  line: number;
  char: number;
}
interface ExtensionError {
  forClass: string;
  file: string;
}
interface DuplicateClass {
  forClass: string;
  files: string[];
}
interface SCSyntaxError {
  msg: string | null;
  file: string | null;
  line: number | null;
  charPos: number | null;
  code: string;
}

interface StateChangeHandlers {
  [name: string]: StateChangeHandler[];
}
interface StateChangeHandler {
  re: RegExp;
  // A handler can return true to stop further processing
  fn: (match: RegExpExecArray, text: string) => void | true;
}

interface Response {
  type: string;
  chunks: string[];
}
interface ResponseCollectors {
  [guid: string]: Response;
}

/**
 * Captures STDOUT
 */
interface Capturing {
  [guid: string]: string[];
}

/**
 * Stores calls
 */
interface Calls {
  [guid: string]: ResolveReject;
}
interface ResolveReject<R = any> {
  resolve: (result: R) => void;
  reject: (error: Error | SCLangError) => void;
}

/**
 * This parses the stdout of sclang and detects changes of the
 * interpreter state and converts compilation errors into js objects.
 *
 * Also detects runtime errors and results posted when sc code
 * is evaluated from supercollider.js
 *
 * Convert errors and responses into JavaScript objects
 *
 * Emit events when state changes
 *
 * @private
 */
export class SclangIO extends EventEmitter {
  states: StateChangeHandlers;
  responseCollectors: ResponseCollectors = {};
  capturing: Capturing = {};
  calls: Calls = {};
  state: State = State.NULL;
  output: string[] = [];
  result: SclangCompileResult;

  constructor() {
    super();
    this.result = new SclangCompileResult();
    this.states = this.makeStates();
    this.reset();
  }

  reset(): void {
    this.responseCollectors = {};
    this.capturing = {};
    this.calls = {};
    this.state = State.NULL;
    // these are stored on the object
    // and are sent with compile error/success event
    this.output = [];
    this.result = new SclangCompileResult();
  }

  /**
   * @param {string} input - parse the stdout of supercollider
   */
  parse(input: string): void {
    let echo = true,
      last = 0;
    const startState = this.state;

    this.states[this.state].forEach((stf: StateChangeHandler): void => {
      let match: RegExpExecArray | null = null;
      if (this.state === startState) {
        while ((match = stf.re.exec(input)) !== null) {
          last = match.index + match[0].length;
          // do not post if any handler returns true
          if (stf.fn(match, input) === true) {
            echo = false;
          }

          // break if its not a /g regex with multiple results
          if (!stf.re.global) {
            break;
          }
        }
      }
    });

    if (echo) {
      this.emit("stdout", input);
    }

    // anything left over should be emitted to stdout ?
    // This might result in some content being emitted twice.
    // Currently if there is anything after SUPERCOLLIDERJS.interpret
    // it is emitted.
    // if (last < input.length  && (startState === this.state)) {
    //   console.log('leftovers:', input.substr(last));
    //   // this.parse(input.substr(last));
    // }

    // state has changed and there is still text to parse
    if (last < input.length && startState !== this.state) {
      // parse remainder with new state
      this.parse(input.substr(last));
    }
  }

  setState(newState: State): void {
    if (newState !== this.state) {
      this.state = newState;
      this.emit("state", this.state);
    }
  }

  makeStates(): StateChangeHandlers {
    return {
      booting: [
        {
          re: /^compiling class library/m,
          fn: (match, text: string): void => {
            this.reset();
            this.setState(State.COMPILING);
            this.pushOutputText(text);
          },
        },
      ],
      compiling: [
        {
          re: /^compile done/m,
          fn: (): void => {
            this.processOutput();
            this.setState(State.COMPILED);
          },
        },
        {
          re: /^Library has not been compiled successfully/m,
          fn: (match, text: string): void => {
            this.pushOutputText(text);
            this.processOutput();
            this.setState(State.COMPILE_ERROR);
          },
        },
        {
          re: /^ERROR: There is a discrepancy\./m,
          fn: (/*match*/): void => {
            this.processOutput();
            this.setState(State.COMPILE_ERROR);
          },
        },
        {
          // it may go directly into initClasses without posting compile done
          re: /Welcome to SuperCollider ([0-9A-Za-z\-.]+)\. /m,
          fn: (match): void => {
            this.result.version = match[1];
            this.processOutput();
            this.setState(State.READY);
          },
        },
        {
          // it sometimes posts this sc3> even when compile failed
          re: /^[\s]*sc3>[\s]*$/m,
          fn: (match, text: string): void => {
            this.pushOutputText(text);
            this.processOutput();
            this.setState(State.COMPILE_ERROR);
          },
        },
        {
          // another case of just trailing off
          re: /^error parsing/m,
          fn: (match, text: string): void => {
            this.pushOutputText(text);
            this.processOutput();
            this.setState(State.COMPILE_ERROR);
          },
        },
        {
          // collect all output
          re: /(.+)/m,
          fn: (match, text: string): void => {
            this.pushOutputText(text);
          },
        },
      ],
      compileError: [],
      compiled: [
        {
          re: /Welcome to SuperCollider ([0-9A-Za-z\-.]+)\. /m,
          fn: (match): void => {
            this.result.version = match[1];
            this.setState(State.READY);
          },
        },
        {
          re: /^[\s]*sc3>[\s]*$/m,
          fn: (/*match:RegExMatchType, text*/): void => {
            this.setState(State.READY);
          },
        },
      ],
      // REPL is now active
      ready: [
        {
          // There may be multiple SUPERCOLLIDERJS matches in a block of text.
          // ie. this is a multi-line global regex
          // This fn is called for each of them with a different match each time
          // but the same text body.
          re: /^SUPERCOLLIDERJS:([0-9A-Za-z-]+):([A-Za-z]+):(.*)$/gm,
          fn: (match, text: string): void | true => {
            const guid = match[1],
              type = match[2],
              body = match[3];
            let response: Response,
              stdout: string,
              obj: JSONObjectType,
              lines: string[],
              started = false,
              stopped = false;

            switch (type) {
              case "CAPTURE":
                if (body === "START") {
                  this.capturing[guid] = [];
                  lines = [];
                  // yuck
                  _.each(text.split("\n"), (l: string): void => {
                    if (l.match(/SUPERCOLLIDERJS:([0-9A-Za-z-]+):CAPTURE:START/)) {
                      started = true;
                    } else if (l.match(/SUPERCOLLIDERJS:([0-9A-Za-z-]+):CAPTURE:END/)) {
                      stopped = true;
                    } else {
                      if (started && !stopped) {
                        lines.push(l);
                      }
                    }
                  });
                  this.capturing[guid].push(lines.join("\n"));
                }
                return true;

              case "START":
                this.responseCollectors[guid] = {
                  type: body,
                  chunks: [],
                };
                return true;

              case "CHUNK":
                this.responseCollectors[guid].chunks.push(body);
                return true;

              case "END":
                response = this.responseCollectors[guid];
                stdout = response.chunks.join("");
                obj = JSON.parse(stdout);

                if (guid in this.calls) {
                  if (response.type === "Result") {
                    // anything posted during CAPTURE should be forwarded
                    // to stdout
                    stdout = this.capturing[guid].join("\n");
                    delete this.capturing[guid];
                    if (stdout) {
                      this.emit("stdout", stdout);
                    }
                    this.calls[guid].resolve(obj);
                  } else {
                    // response.type === "Error"
                    let err: SCSyntaxError | undefined = undefined;
                    if (response.type === "SyntaxError") {
                      stdout = this.capturing[guid].join("\n");
                      err = this.parseSyntaxErrors(stdout);
                      delete this.capturing[guid];
                    }
                    this.calls[guid].reject(
                      new SCLangError(`Interpret error: ${obj && obj["errorString"]}`, response.type, err || obj),
                    );
                  }
                  delete this.calls[guid];
                } else {
                  // I hope sc doesn't post multiple streams at the same time
                  if (guid === "0") {
                    // out of band error
                    this.emit("error", { type: response.type, error: obj });
                  }
                }
                delete this.responseCollectors[guid];
                return true;

              default:
            }
          },
        },
        {
          re: /^SUPERCOLLIDERJS.interpreted$/gm,
          fn: (match, text: string): true => {
            let rest = text.substr(match.index + 28);
            // remove the prompt ->
            rest = rest.replace(/-> \r?\n?/, "");
            this.emit("stdout", rest);
            return true;
          },
        },
        {
          // user compiled programmatically eg. with Quarks.gui button
          re: /^compiling class library/m,
          fn: (match, text: string): void => {
            this.reset();
            this.setState(State.COMPILING);
            this.pushOutputText(text);
          },
        },
      ],
    };
  }

  /**
   * Register resolve and reject callbacks for a block of code that is being sent
   * to sclang to be interpreted.
   *
   * callbacks - an object with reject, resolve
   */
  registerCall(guid: string, callbacks: ResolveReject): void {
    this.calls[guid] = callbacks;
  }

  /**
   * Parse syntax error from STDOUT runtime errors.
   */
  parseSyntaxErrors(text: string): SCSyntaxError {
    const msgRe = /^ERROR: syntax error, (.+)$/m,
      msgRe2 = /^ERROR: (.+)$/m,
      fileRe = /in file '(.+)'/m,
      lineRe = /line ([0-9]+) char ([0-9]+):$/m;

    const msg = msgRe.exec(text) || msgRe2.exec(text),
      line = lineRe.exec(text),
      file = fileRe.exec(text),
      code = text
        .split("\n")
        .slice(4, -3)
        .join("\n")
        .trim();
    return {
      msg: msg && msg[1],
      file: file && file[1],
      line: line && parseInt(line[1], 10),
      charPos: line && parseInt(line[2], 10),
      code: code,
    };
  }

  /**
   * Push text posted by sclang during library compilation
   * to the .output stack for later procesing
   */
  pushOutputText(text: string): void {
    this.output.push(text);
  }

  /**
   * Consume the compilation output stack, merging any results
   * into this.result and resetting the stack.
   */
  processOutput(): void {
    const parsed = this.parseCompileOutput((this.output || []).join("\n"));

    // merge with any previously processed
    _.each(parsed, (value, key): void => {
      if (_.isArray(value)) {
        this.result[key] = (this.result[key] || []).concat(value);
      }
      if (_.isString(value)) {
        this.result[key] = (this.result[key] || "") + value;
      }
    });

    this.output = [];
  }

  /**
   * Parse library compile errors and information
   * collected from sclang STDOUT.
   */
  parseCompileOutput(text: string): SclangCompileResult {
    const errors = new SclangCompileResult();

    // NumPrimitives = 688
    // multiple:
    // compiling dir: ''
    const dirsRe = /^[\s]+compiling dir:[\s]+'(.+)'$/gm;
    let match: RegExpExecArray | null = null;
    let end = 0;

    while ((match = dirsRe.exec(text))) {
      errors.dirs.push(match[1]);
      end = match.index + match[0].length;
    }

    // the rest are the error blocks
    const rest = text.substr(end),
      // split on ---------------------
      // blocks = rest.split(/^\-+$/m),
      // message
      // in file 'path' line x char y:
      errRe = /([^\n]+)\n\s+in file '([^']+)'\n\s+line ([0-9]+) char ([0-9]+)/gm,
      nonExistentRe = /Class extension for nonexistent class '([A-Za-z0-9_]+)[\s\S]+In file:'(.+)'/gm,
      duplicateRe = /^ERROR: duplicate Class found: '([A-Za-z0-9_]+)'\n([^\n]+)\n([^\n]+)\n/gm,
      commonPath = /^\/Common/;

    while ((match = errRe.exec(rest))) {
      let file = match[2];
      // errors in Common library are posted as '/Common/...'
      if (commonPath.exec(file)) {
        file = errors.dirs[0] + file;
      }
      errors.errors.push({
        msg: match[1],
        file: file,
        line: parseInt(match[3], 10),
        char: parseInt(match[4], 10),
      });
    }

    while ((match = nonExistentRe.exec(text))) {
      errors.extensionErrors.push({
        forClass: match[1],
        file: match[2],
      });
    }

    while ((match = duplicateRe.exec(text)) !== null) {
      errors.duplicateClasses.push({
        forClass: match[1],
        files: [match[2], match[3]],
      });
    }

    return errors;
  }
}
