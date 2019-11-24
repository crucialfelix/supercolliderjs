const sc = require("supercolliderjs");

sc.server.boot().then(async sc => {
  // Allocate an 8 second stereo audio buffer
  const b = await sc.buffer(44 * 1024 * 8, 2);
});
