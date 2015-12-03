

import Immutable from 'immutable';

/**
 * A store that holds a state tree.
 *
 * Holds an Immutable.Map and offers functions to mutate sub-states in that tree,
 * and stores the new state.
 */
export default class Store {

  constructor() {
    this.state = Immutable.Map();
  }

  getIn(keys, notSetValue) {
    return this.state.getIn(keys, notSetValue);
  }

  /**
   * Fetch the object at keys
   * pass it to the function which mutates it and returns new sub state.
   */
  mutateState(keys, fn) {
    this.state = this.state.updateIn(keys, Immutable.Map(), fn);
  }

  /**
   * Fetch one part of the state,
   * mutate it with the callback,
   * which returns result, subState.
   * Save the subState back into state and return the result.
   *
   * @returns {any} result
   */
  mutateStateAndReturn(keys, fn) {
    var result, subState;
    [result, subState] = fn(this.state.getIn(keys, Immutable.Map()));
    this.state = this.state.setIn(keys, subState);
    return result;
  }
}
