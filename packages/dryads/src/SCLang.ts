import { Dryad, CallOrder, Command } from "dryadic";
import _ from "lodash";

import LanguageServer, { boot, SCLangArgs } from "@supercollider/lang";
import Logger from "@supercollider/logger";

const defaultOptions: SCLangArgs = {
  debug: true,
  echo: false,
  stdin: false,
};

interface Properties {
  options: SCLangArgs;
}

interface Context {
  sclang?: LanguageServer;
  log?: Logger;
}

/**
 * Boots a new SuperCollider language interpreter (sclang) making it available for all children as context.sclang
 *
 * Always boots a new one, ignoring any possibly already existing one in the parent context.
 *
 * `options` are the command line options supplied to sclang (note: not all options are passed through yet)
 * see {@link lang/SCLang}
 *
 * Not to be confused with the other class named SCLang which does all the hard work.
 * This Dryad class is just a simple wrapper around that.
 */
export default class SCLang extends Dryad<Properties> {
  defaultProperties(): Properties {
    return {
      options: defaultOptions,
    };
  }

  prepareForAdd(): Command {
    return {
      callOrder: CallOrder.SELF_THEN_CHILDREN,
      updateContext: (context: Context, properties: Properties) => ({
        sclang: boot(_.defaults(properties.options, { log: context.log })),
      }),
    };
  }

  remove(): Command {
    return {
      run: (context: Context) => {
        return context.sclang && context.sclang.quit();
      },
    };
  }
}
