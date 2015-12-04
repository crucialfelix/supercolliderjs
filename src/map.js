
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
