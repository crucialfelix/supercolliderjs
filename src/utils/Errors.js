
/**
 * Adds a data fields to the standard Error class.
 *
 * Any information you like may be stored there that may be helpful
 * in debugging.
 */
export default class SCError extends Error {

  constructor(message:string, data:Object) {
    super(message);
    this.data = data;
  }

}
