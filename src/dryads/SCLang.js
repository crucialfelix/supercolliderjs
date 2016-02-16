
import {Dryad} from 'dryadic';
import {boot} from '../lang/sclang';

const defaultOptions = {
  debug: true,
  echo: false,
  stdin: false
};

/**
 * Boots a new supercollider language interpreter (sclang) making it available for all children as context.sclang
 *
 * Always boots a new one, ignoring any possibly already existing one in context.
 */
export default class SCLang extends Dryad {

  constructor(options=defaultOptions, children=[]) {
    super({options}, children);
  }

  prepareForAdd() {
    return {
      sclang: () => boot(this.properties.options)
    };
  }

  remove() {
    return {
      run: (context) => {
        return context.sclang.quit();
      }
    };
  }
}
