import { Dryad } from "dryadic";
import * as _ from "lodash";

import { ServerArgs } from "../server/options";
import Server, { boot } from "../server/server";
import Logger from "../utils/logger";

const defaultOptions = {
  debug: false,
};

interface Properties {
  options: ServerArgs;
}

interface Context {
  out: number;
  group: number;
  log?: Logger;
  scserver?: Server;
}

/**
 * Boots a new SuperCollider server (scsynth) making it available for all children as `context.scserver`
 *
 * Always boots a new one, ignoring any possibly already existing one in the parent context.
 *
 * `options` are the command line options supplied to scsynth (note: not all options are passed through yet)
 * see {@link Server}
 */
export default class SCServer extends Dryad {
  defaultProperties(): Properties {
    return {
      options: defaultOptions,
    };
  }

  initialContext(): Context {
    return {
      out: 0,
      group: 0,
    };
  }

  prepareForAdd(): object {
    return {
      callOrder: "SELF_THEN_CHILDREN",
      updateContext: (context: Context, properties: Properties) => ({
        scserver: boot(_.defaults(properties.options, { log: context.log })),
      }),
    };
  }

  remove(): object {
    return {
      run: (context: Context) => {
        if (context.scserver) {
          return context.scserver.quit();
        }
      },
    };
  }
}
