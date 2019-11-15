import { server } from "supercolliderjs";

server.run(async sc => {
  // Allocate an 8 second stereo audio buffer
  const b = await sc.buffer(44 * 1024 * 8, 2);
});
