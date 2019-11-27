import { Dryad, CallOrder, Command, Properties } from "dryadic";
import _ from "lodash";

import Server, { boot, ServerArgs } from "@supercollider/server";
import Logger from "@supercollider/logger";

const defaultOptions = {
  debug: false,
};

interface ServerProperties extends Properties {
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
export default class SCServer extends Dryad<ServerProperties> {
  defaultProperties(): ServerProperties {
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

  prepareForAdd(): Command {
    return {
      callOrder: CallOrder.SELF_THEN_CHILDREN,
      updateContext: (context: Context, properties: ServerProperties) => ({
        scserver: boot(_.defaults(properties.options, { log: context.log })),
      }),
    };
  }

  remove(): Command {
    return {
      run: (context: Context) => {
        if (context.scserver) {
          return context.scserver.quit();
        }
      },
    };
  }
}
