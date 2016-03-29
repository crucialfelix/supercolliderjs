import scserver from './middleware/scserver';

import SCServer from './SCServer';
import SCLang from './SCLang';
import Group from './Group';
import Synth from './Synth';
import AudioBus from './AudioBus';
import SCSynthDef from './SCSynthDef';
import SynthControl from './SynthControl';
import SynthStream from './SynthStream';

import {dryadic as makeDryadPlayer} from 'dryadic';

// re-export all the Dryad classes
export {
  SCServer,
  SCLang,
  Group,
  Synth,
  AudioBus,
  SCSynthDef,
  SynthControl,
  SynthStream
};

// export the layer for app = dryadic().use(layer)
export const layer = {
  middleware: [
    scserver
  ],
  classes: [
    SCServer,
    SCLang,
    Group,
    Synth,
    AudioBus,
    SCSynthDef,
    SynthControl,
    SynthStream
  ]
};


/**
 * Create a DryadPlayer from a Dryad or hyperscript definition.
 *
 * Automatically includes the supercollider.js layer
 *
 * usage:
 *
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
 *   ...
 *   player.stop();
 */
export function dryadic(rootDryad, moreLayers=[]) {
  return makeDryadPlayer(rootDryad, [layer].concat(moreLayers));
};

/**
 * Play a Dryad or hyperscript document.
 *
 * usage:
 *
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
 *
 * @param {Dryad|Array} rootDryad - Dryad object or hyperscript document
 * @returns {DryadPlayer}
 */
export function play(rootDryad) {
  return dryadic(rootDryad).play();
}


/**
 * Convert hyperscript object to a tree of Dryads.
 *
 * This lookups each class by lower class 'classname'
 * and creates an instance with properties and children.
 */
export function h(hgraph) {
  let player = dryadic();
  return player.h(hgraph);
}
