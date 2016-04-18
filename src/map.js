
export function midiToFreq(midiNote) {
  return 440.0 * Math.pow(2, (midiNote - 69.0) / 12.0);
}

export function freqToMidi(freq) {
  let mult = Math.log(freq / 400.0) / Math.log(2);
  return Math.round(12.0 * mult + 69);
}

export function linToLin(inMin, inMax, outMin, outMax, value) {
  if (value <= inMin) {
    return outMin;
  }
  if (value >= inMax) {
    return outMax;
  }
  return (value - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
}

export function linToExp(inMin, inMax, outMin, outMax, value) {
  if (value <= inMin) {
    return outMin;
  }
  if (value >= inMax) {
    return outMax;
  }
  return Math.pow(outMax / outMin, (value - inMin) / (inMax - inMin)) * outMin;
}

export function expToLin(inMin, inMax, outMin, outMax, value) {
  if (value <= inMin) {
    return outMin;
  }
  if (value >= inMax) {
    return outMax;
  }
  return (
    Math.pow(
      outMax / outMin,
      Math.log(value / inMin) / Math.log(inMax / inMin))
  ) * outMin;
}

export function ampToDb(amp) {
  return Math.log10(amp) * 20.0;
}

export function dbToAmp(db) {
  return Math.pow(10.0, db * 0.05);
}

/**
 * Returns a linear mapping function
 */
export function linear(spec) {
  let range = spec.maxval - spec.minval;
  return function(value) {
    return value * range + spec.minval;
  };
}

/**
 * Returns an exponential mapping function
 */
export function exp(spec) {
  let ratio = spec.maxval / spec.minval;
  return function(value) {
    return Math.pow(ratio, value) * spec.minval;
  };
}

/**
 * Returns dB mapping function (DbFaderWarp)
 */
export function dB(spec) {
  let minval = dbToAmp(spec.minval);
  let range = dbToAmp(spec.maxval) - minval;
  return function(value) {
    return ampToDb(Math.pow(value, 2) * range - minval);
  };
}

/**
 * Returns amp mapping function (FaderWarp)
 */
export function fader(spec) {
  let range = spec.maxval - spec.minval;
  return function(value) {
    return Math.pow(value, 2) * range - spec.minval;
  };
}

/**
 * Returns inverse of linear mapping function
 */
export function unmapLinear(spec) {
  let range = spec.maxval - spec.minval;
  return function(value) {
    return (value - spec.minval) / range;
  };
}

/**
 * Returns inverse of exponential mapping function
 */
export function unmapExp(spec) {
  let ratio = Math.log(spec.maxval / spec.minval);
  return function(value) {
    return Math.log(value / spec.minval) / ratio;
  };
}

/**
 * Returns inverse of dB mapping function (DbFaderWarp)
 */
export function unmapDb(spec) {
  let minval = dbToAmp(spec.minval);
  let range = dbToAmp(spec.maxval) - minval;
  return function(value) {
    return (dbToAmp(value) - minval) / Math.sqrt(range);
  };
}

/**
 * Returns inverse of amp mapping function (FaderWarp)
 */
export function unmapFader(spec) {
  let range = spec.maxval - spec.minval;
  return function(value) {
    return Math.sqrt((value - spec.minval) / range);
  };
}

export function unmapWithSpec(value, spec) {
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

export function mapWithSpec(value, spec) {
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
