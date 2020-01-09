/**
 * Dryadic components for SuperCollider
 *
 * @package dryads
 */
import scserver from "./middleware/scserver";

import SCServer from "./SCServer";
import SCLang from "./SCLang";
import Group from "./Group";
import Synth from "./Synth";
import AudioBus from "./AudioBus";
import SCSynthDef from "./SCSynthDef";
import SynthControl from "./SynthControl";
import SynthStream from "./SynthStream";
import SynthEventList from "./SynthEventList";

// confusing to swap the names like this
// import { dryadic as makeDryadPlayer } from "dryadic";
import { Dryad, DryadPlayer, Middleware, dryadic as makeDryadPlayer, Layer } from "dryadic";

// re-export all the Dryad classes
export { SCServer, SCLang, Group, Synth, AudioBus, SCSynthDef, SynthControl, SynthStream, SynthEventList };

const middleware: Middleware[] = [scserver];
const classes = [SCServer, SCLang, Group, Synth, AudioBus, SCSynthDef, SynthControl, SynthStream, SynthEventList];

/**
 * A layer adds Dryad classes and middleware for an external library. eg. for Supercolliderjs
 */
export const layer: Layer = {
  middleware,
  classes,
};

// export const ServerMiddleware = scserver;

export interface Context {
  [name: string]: any;
}

/**
 * Create a DryadPlayer from a Dryad or hyperscript definition.
 *
 * Automatically includes the supercollider.js layer
 *
 * usage:
 * ```js
 *   var sc = require('supercolliderjs');
 *   var player = sc.dryadic([
 *     'scserver', [
 *       ['group', [
 *         ['synth', {
 *           defName: 'sinosc',
 *           args: {
 *             freq: 440
 *           }
 *         }]
 *       ]
 *   ]);
 *   player.play();
 *   // ...
 *   player.stop();
 * ```
 */
export function dryadic(rootDryad?: Dryad, moreLayers: Layer[] = [], rootContext: Context = {}): DryadPlayer {
  return makeDryadPlayer(rootDryad || new Dryad(), [layer, ...moreLayers], rootContext);
}

/**
 * Play a Dryad or hyperscript document.
 *
 * usage:
 *
 * ```js
 *   var sc = require('supercolliderjs');
 *   var player = sc.play([
 *     'scserver', [
 *       ['group', [
 *         ['synth', {
 *           defName: 'sinosc',
 *           args: {
 *             freq: 440
 *           }
 *         }]
 *       ]
 *   ]);
 * ```
 * @param {Dryad|Array} rootDryad - Dryad object or hyperscript document
 * @returns {DryadPlayer}
 */
export function play(rootDryad: Dryad): Promise<DryadPlayer> {
  return dryadic(rootDryad).play();
}

/**
 * Convert hyperscript object to a tree of Dryads.
 *
 * This lookups each class by lower class 'classname'
 * and creates an instance with properties and children.
 */
export function h(hgraph: any): Dryad {
  const player = dryadic();
  return player.h(hgraph);
}
