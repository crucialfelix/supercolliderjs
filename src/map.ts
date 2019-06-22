/**
 * Useful mapping functions from supercollider
 *  @flow
 *  @module map
 */

/**
 * Convert a MIDI note (1..127) to frequency.
 */
export function midiToFreq(midiNote: number): number {
  return 440.0 * Math.pow(2, (midiNote - 69.0) / 12.0);
}

/**
 * Convert frequency to MIDI note (1..127).
 */
export function freqToMidi(freq: number): number {
  let mult = Math.log(freq / 400.0) / Math.log(2);
  return Math.round(12.0 * mult + 69);
}

/**
 * Map a number from linear min/max to min/max.
 */
export function linToLin(
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  value: number
): number {
  if (value <= inMin) {
    return outMin;
  }
  if (value >= inMax) {
    return outMax;
  }
  return (value - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
}

/**
* Map a number from linear min/max to exponential min/max.
 */
export function linToExp(
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  value: number
): number {
  if (value <= inMin) {
    return outMin;
  }
  if (value >= inMax) {
    return outMax;
  }
  return Math.pow(outMax / outMin, (value - inMin) / (inMax - inMin)) * outMin;
}

/**
* Map a number from exponential min/max to linear min/max.
 */
export function expToLin(
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  value: number
): number {
  if (value <= inMin) {
    return outMin;
  }
  if (value >= inMax) {
    return outMax;
  }
  return Math.pow(
    outMax / outMin,
    Math.log(value / inMin) / Math.log(inMax / inMin)
  ) * outMin;
}

/**
 * Map an amplitude value (usually 0..1) to dB.
 */
export function ampToDb(amp: number): number {
  return Math.log10(amp) * 20.0;
}

/**
 * Map dB to an amplitude value that can be used as a multiplier.
 */
export function dbToAmp(db: number): number {
  return Math.pow(10.0, db * 0.05);
}

/**
 * Returns a function that maps 0..1 input to the spec's minval..maxval with a linear curve.
 */
export function linear(spec: Object): Function {
  let range = spec.maxval - spec.minval;
  return function(value) {
    return value * range + spec.minval;
  };
}

/**
 * Returns a function that maps 0..1 input to the spec's minval..maxval with an exponential curve. minval/maxval must not have oppositive signs -- ie. the output range must not cross zero.
 */
export function exp(spec: Object): Function {
  let ratio = spec.maxval / spec.minval;
  return function(value) {
    return Math.pow(ratio, value) * spec.minval;
  };
}

/**
 * Returns dB mapping function (DbFaderWarp)
 */
export function dB(spec: Object): Function {
  let minval = dbToAmp(spec.minval);
  let range = dbToAmp(spec.maxval) - minval;
  return function(value) {
    return ampToDb(Math.pow(value, 2) * range - minval);
  };
}

/**
 * Returns amp mapping function (FaderWarp)
 */
export function fader(spec: Object): Function {
  let range = spec.maxval - spec.minval;
  return function(value) {
    return Math.pow(value, 2) * range - spec.minval;
  };
}

/**
 * Returns inverse of linear mapping function
 */
export function unmapLinear(spec: Object): Function {
  let range = spec.maxval - spec.minval;
  return function(value) {
    return (value - spec.minval) / range;
  };
}

/**
 * Returns inverse of exponential mapping function
 */
export function unmapExp(spec: Object): Function {
  let ratio = Math.log(spec.maxval / spec.minval);
  return function(value) {
    return Math.log(value / spec.minval) / ratio;
  };
}

/**
 * Returns inverse of dB mapping function (DbFaderWarp)
 */
export function unmapDb(spec: Object): Function {
  let minval = dbToAmp(spec.minval);
  let range = dbToAmp(spec.maxval) - minval;
  return function(value) {
    return (dbToAmp(value) - minval) / Math.sqrt(range);
  };
}

/**
 * Returns inverse of amp mapping function (FaderWarp)
 */
export function unmapFader(spec: Object): Function {
  let range = spec.maxval - spec.minval;
  return function(value) {
    return Math.sqrt((value - spec.minval) / range);
  };
}

/**
 * Returns the inverse mapping function for a spec, using the curve
 * as defined by spec.warp
 */
export function unmapWithSpec(value: number, spec: Object): number {
  switch (spec.warp) {
    case 'linear':
    case 'lin':
      return unmapLinear(spec)(value);
    case 'exp':
    case 'exponential':
      return unmapExp(spec)(value);
    case 'amp':
      return unmapFader(spec)(value);
    case 'db':
      return unmapDb(spec)(value);
    default:
      throw new Error('Warp unknown or not yet implemented' + spec.warp);
  }
}

/**
 * Returns the mapping function for a spec, using the curve
 * as defined by spec.warp
 */
export function mapWithSpec(value: number, spec: Object): number {
  switch (spec.warp) {
    case 'linear':
    case 'lin':
      return linear(spec)(value);
    case 'exp':
    case 'exponential':
      return exp(spec)(value);
    case 'amp':
      return fader(spec)(value);
    case 'db':
      return dB(spec)(value);
    default:
      throw new Error('Warp unknown or not yet implemented' + spec.warp);
  }
}
