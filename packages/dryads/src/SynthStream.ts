import Server, { msg, OscType, MsgType } from "@supercollider/server";
import { EventStream } from "baconjs";
import { Dryad, DryadPlayer, Command } from "dryadic";
import _ from "lodash";

import Group from "./Group";

const { AddActions, nodeFree, synthNew } = msg;

const LATENCY = 0.03;

interface Params {
  [name: string]: OscType;
}

interface Properties {
  stream: EventStream<any, Event>;
  defaultParams?: Params;
}

interface Context {
  id: string;
  nodeID?: number;
  out?: number;
  group?: number;
  // parent context
  scserver: Server;

  // state
  subscription?: any;
  nodeIDs?: {
    [key: string]: number;
  };
}

export interface Event {
  defName: string;
  args?: Params;
  // midinote
  key?: number;
  type?: string; // "noteOn" | "noteOff";
}

interface SynthStreamEventCommand extends Command {
  scserver: {
    bundle: {
      time: number;
      packets: MsgType[];
    };
  };
  updateContext: {
    nodeIDs: {
      [key: string]: number;
    };
  };
}
/**
 * Given a Bacon.js stream that returns objects, this spawns a series of Synths.
 *
 * Properties:
 *  {Bacon.EventStream} stream
 *  {object} defaultParams
 *
 * The event values should be simple JavaScript objects:
 *
 * {
 *   defName: 'synthDefName',
 *   args: {
 *     out: 0,
 *     freq: 440
 *   }
 * }
 *
 * defaultParams is a fixed object into which the event value is merged.
 */
export default class SynthStream extends Dryad<Properties> {
  add(player: DryadPlayer): Command {
    return {
      run: (context: Context, properties: Properties) => {
        const subscription = properties.stream.subscribe(event => {
          // This assumes a Bacon event.
          // Should validate that event.value is object
          // assumes context has not been updated and is the same event
          // use player.getContext()
          this.handleEvent(event.value(), context, properties, player);
        });
        player.updateContext(context, { subscription });
      },
      // initial event
      // scserver: {
      //   bundle: ()
      // }
    };
  }

  commandsForEvent(event: Event, context: Context, properties: Properties): SynthStreamEventCommand {
    const msgs: MsgType[] = [];
    let updateContext;
    const nodeIDs = context.nodeIDs || {};
    const key = event.key ? String(event.key) : "undefined";

    switch (event.type) {
      case "noteOff": {
        // if no key then there is no way to shut off notes
        // other than sending to the group
        const nodeID: number = nodeIDs[key];
        if (nodeID) {
          msgs.push(nodeFree(nodeID || -1));
          // TODO: if synthDef hasGate else just free it
          // msgs.push(nodeSet(nodeID, [event.gate || 'gate', 0]));
          // remove from nodeIDs
          updateContext = {
            nodeIDs: _.omit(nodeIDs, [key]),
          };
        } else {
          throw new Error(`NodeID was not registered for event key ${key || "undefined"}`);
        }
        break;
      }

      default: {
        // noteOn
        const defaultParams = properties.defaultParams || {};
        const args = _.assign({ out: context.out || 0 }, defaultParams.args, event.args);
        const defName = event.defName || (defaultParams.defName as string);
        // if ev.id then create a nodeID and store it
        // otherwise it is anonymous
        let nodeID = -1;
        if (key) {
          nodeID = context.scserver.state.nextNodeID();
          // store the nodeID
          updateContext = {
            nodeIDs: _.assign({}, nodeIDs, {
              [key]: nodeID,
            }),
          };
        }
        const synth = synthNew(defName, nodeID, AddActions.TAIL, context.group, args);
        msgs.push(synth);
      }
    }

    return {
      scserver: {
        bundle: {
          time: LATENCY,
          packets: msgs,
        },
      },
      updateContext,
    };
  }

  handleEvent(event: Event, context: Context, properties: Properties, player: DryadPlayer): void {
    player.callCommand(context.id, this.commandsForEvent(event, context, properties));
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

  subgraph(): Dryad {
    return new Group({}, [this]);
  }
}
