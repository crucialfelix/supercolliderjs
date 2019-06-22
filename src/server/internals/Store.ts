/* @flow */
import { Map } from 'immutable';

/**
 * A Store that holds a state tree. This is used by ServerState as
 * its immutable memory storage.
 *
 * Holds an Immutable.Map
 * and offers functions to mutate sub-states
 * in that tree, and stores the new state.
 *
 * https://facebook.github.io/immutable-js/docs/#/Map
 */
export default class Store {
  state: Map<string, any>;

  constructor() {
    this.state = Map();
  }

  getIn(keys: Array<string>, notSetValue: any): any {
    return this.state.getIn(keys, notSetValue);
  }

  /**
   * Fetch the object at keys
   * pass it to the function which mutates it and returns new sub state.
   */
  mutateState(keys: Array<string>, fn: Function) {
    this.state = this.state.updateIn(keys, Map(), fn);
  }

  /**
   * Fetch one part of the state,
   * mutate it with the callback,
   * which returns result, subState.
   * Save the subState back into state and return the result.
   *
   * @returns {any} result
   */
  mutateStateAndReturn(keys: Array<string>, fn: Function): any {
    var result, subState;
    [result, subState] = fn(this.state.getIn(keys, Map()));
    this.state = this.state.setIn(keys, subState);
    return result;
  }
}
