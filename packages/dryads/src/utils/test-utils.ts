import each from "lodash/each";
import { dryadic } from "../index";
import { Dryad, DryadPlayer } from "dryadic";

type JSONType = any;

export function makePlayer(dryad: Dryad): DryadPlayer {
  return dryadic(dryad);
}

export function expectPlayGraphToEqual(dryad: Dryad, expected: JSONType, ignoreFn?: Function): JSONType {
  const p = makePlayer(dryad);
  if (!p.tree) {
    // never
    throw new Error("p.tree is undefined");
  }
  let g = p.tree.hyperscript();

  if (ignoreFn) {
    g = ignoreFn(g);
    if (expected) {
      expected = ignoreFn(expected);
    }
  }

  if (expected) {
    expect(g).toEqual(expected);
  }

  return g;
}

/**
 * Get a command object to inspect it for testing.
 * Calls any function in scserver msg/bundle so the result
 * will be the actual OSC message/bundle.
 *
 * @param  player
 * @param  commandName  'add' 'remove' etc.
 * @param  {Array}  [childAt=[]] Index array to fetch a child command
 *                               for examining the command of a child.
 *                               Especially useful when the Dryad uses
 *                               requireParent or Properties so that the
 *                               command you are testing is not the
 *                               top level.
 * @return Command object
 */
export function getCommand(player: DryadPlayer, commandName: string, childAt: number[] = []): object {
  const cmd = player._collectCommands(commandName);
  // specify which child you want to get the command for with indices:
  // null top
  // [0] first child
  // [0, 0] first child first child
  let obj = cmd;
  each(childAt, i => {
    obj = obj.children[i];
  });

  return obj;
}

// export function getOSCMsg(player:DryadPlayer, commandName:string='add', childAt:[number]=[])
//   let cmd = getCommand(player, commandName, childAt);
//   // this is actually calling the CommandNode
//   console.log('getCommand got', cmd);
//
//   if (cmd.commands.scserver) {
//     // msg
//
//     // value them with context and properties
//     let properties = cmd.resolveProperties();
//     let msg = cmd.
//     obj.commands.scserver = resolveFuncs(obj.commands.scserver, obj.context, obj.properties);
//   }
//
//   return obj;
// }
