import { EventStream } from "baconjs";
import { Dryad, DryadPlayer } from "dryadic";
import * as _ from "lodash";

import { nodeSet, Params } from "../server/osc/msg";

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
export default class SynthControl extends Dryad {
  /**
   * If there is no SCServer in the parent context,
   * then this will wrap itself in an SCServer
   */
  requireParent(): string {
    return "SCServer";
  }

  add(player: DryadPlayer): object {
    return {
      run: (context: Context, properties: Properties) => {
        if (properties.stream) {
          let subscription = properties.stream.subscribe(event => {
            // This assumes a Bacon event.
            // Should validate that event.value is object
            let msg = nodeSet(context.nodeID || -1, event.value());
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

  remove(): object {
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
