
import {Dryad} from 'dryadic';
import Group from './Group';
import {synthNew, nodeFree, AddActions} from '../server/osc/msg.js';
import * as _  from 'lodash';

const LATENCY = 0.03;

/**
 * Given a Bacon.js stream that returns objects, this spawns a series of Synths.
 *
 * Properties:
 *  {Bacon.EventStream} stream
 *  {Object} defaultParams
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
export default class SynthStream extends Dryad {

  add(player: DryadicPlayer) {
    return {
      run: (context) => {
        let subscription = this.properties.stream.subscribe((event) => {
          // This assumes a Bacon event.
          // Should validate that event.value is object
          this.handleEvent(event.value(), context, player);
        });
        player.updateContext(context, {subscription});
      }
    };
  }

  commandsForEvent(event: Object, context: Object) {
    const msgs = [];
    let updateContext;
    let nodeIDs = context.nodeIDs || {};
    let key = event.key ? String(event.key) : undefined;

    switch (event.type) {

      case 'noteOff': {
        // if no key then there is no way to shut off notes
        // other than sending to the group
        let nodeID:int = nodeIDs[key];
        if (nodeID) {
          msgs.push(nodeFree(nodeID));
          // TODO: if synthDef hasGate else just free it
          // msgs.push(nodeSet(nodeID, [event.gate || 'gate', 0]));
          // remove from nodeIDs
          updateContext = {
            nodeIDs: _.omit(nodeIDs, [key])
          };
        } else {
          throw new Error(`NodeID was not registered for event key ${key}`);
        }
        break;
      }

      default: {
        // noteOn
        let defaultParams = this.properties.defaultParams || {};
        const args = _.assign({out: context.out || 0}, defaultParams.args, event.args);
        const defName = event.defName || this.properties.defaultParams.defName;
        // if ev.id then create a nodeID and store it
        // otherwise it is anonymous
        let nodeID = -1;
        if (key) {
          nodeID = context.scserver.state.nextNodeID();
          // store the nodeID
          updateContext = {
            nodeIDs: _.assign({}, nodeIDs, {
              [key]: nodeID
            })
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
          packets: msgs
        }
      },
      updateContext
    };
  }

  handleEvent(event: Object, context: Object, player: DryadicPlayer) {
    player.callCommand(context.id, this.commandsForEvent(event, context));
  }

  remove() {
    return {
      run: (context:Object) => {
        if (context.subscription) {
          if (_.isFunction(context.subscription)) {
            // baconjs style
            context.subscription();
          } else {
            // Rx style
            context.subscription.dispose();
          }
        }
      }
    };
  }

  subgraph() {
    return new Group({}, [this]);
  }
}
