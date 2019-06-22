/* @flow */
import assign from 'lodash/assign';

// http://www.2ality.com/2011/12/subtyping-builtins.html
function copyOwnFrom(target: Object, source: Object): Object {
  Object.getOwnPropertyNames(source).forEach(function(propName: string) {
    Object.defineProperty(
      target,
      propName,
      Object.getOwnPropertyDescriptor(source, propName)
    );
  });
  return target;
}

class ExtendableError {
  message: string;
  stack: string;

  constructor(message: string) {
    let superInstance = new Error(message); // Error.apply(null, [message]);
    copyOwnFrom(this, superInstance);
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = superInstance.stack;
    }
  }
}

/**
 * A custom error class that adds a data field for passing structured error data.
 *
 */
export class SCError extends ExtendableError {
  data: Object;

  constructor(message: string, data: Object) {
    super(message);
    this.data = data;
  }

  /**
    * Update message and data with additional information.
    * Used when passing the error along but when you want
    * to add additional contextual debugging information.
    */
  annotate(message: string, data: Object) {
    this.message = message;
    this.data = assign(this.data, data);
  }
}

/**
 * SCLangError - syntax errors while interpreting code, interpret code execution errors, and asynchronous errors.
 *
 * @param type - SyntaxError | Error : Tells which format the error object will be in.
 * @param error - The error data object
 *               An Error will have a stack trace and all of the fields of the sclang error
 *               that it is generated from.
 *               SyntaxError is created by parsing the posted output of sclang.
 *
 * See SuperColliderJS-encodeError
 *
 * @param data - optional additional debug information supplied from supercollider.js
 */
export class SCLangError extends SCError {
  type: string;
  error: Object;

  constructor(message: string, type: string, error: Object, data: Object = {}) {
    super(message, data);
    this.type = type;
    this.error = error;
    this.data = data;
  }
}
