import { msg, OscType } from "@supercollider/server";
import { EventStream } from "baconjs";
import { Dryad, DryadPlayer, Command } from "dryadic";
import _ from "lodash";

const { nodeSet } = msg;

interface Params {
  [name: string]: OscType;
}

interface Properties {
  stream: EventStream<any, Params>;
}

interface Context {
  id: string;
  nodeID?: number;
  subscription?: any;
}
/**
 * Sends nodeSet messages to the Synth in the parent context.
 *
 * This takes a Bacon.js stream which should return objects
 * {param: value, ...} and sends `nodeSet` messages to the parent Synth.
 *
 * SynthControl should be a child of a Synth, Group or other Dryad that
 * sets context.nodeID
 */
export default class SynthControl extends Dryad<Properties> {
  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent(): string {
    return "SCServer";
  }

  add(player: DryadPlayer): Command {
    return {
      run: (context: Context, properties: Properties) => {
        if (properties.stream) {
          const subscription = properties.stream.subscribe(event => {
            // This assumes a Bacon event.
            // Should validate that event.value is object
            const msg = nodeSet(context.nodeID || -1, event.value());
            player.callCommand(context.id, {
              scserver: {
                bundle: {
                  time: 0.03,
                  packets: [msg],
                },
              },
            });
          });
          player.updateContext(context, { subscription });
        }
      },
    };
  }

  remove(): Command {
    return {
      run: (context: Context) => {
        if (context.subscription) {
          if (_.isFunction(context.subscription)) {
            // baconjs style
            context.subscription();
          } else {
            // Rx style
            context.subscription.dispose();
          }
        }
      },
    };
  }
}
