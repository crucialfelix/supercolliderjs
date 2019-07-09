/* eslint no-console: 0 */
import { resolveOptions } from "@supercollider.js/server";
import fs from "fs";

/**
 * Check that scsynth and sclang executables exist.
 *
 * This can be called in a postInstall step for a package
 * to inform the user if it can or cannot find scsynth and sclang.
 *
 * Posts the options to console.
 * Posts errors and any information it can find to help
 * the user.
 */
export default function checkInstall(checkSclang = true, checkScsynth = true) {
  console.log("Checking supercollider.js install...");
  resolveOptions()
    .then(options => {
      console.log("Default options:");
      console.log(JSON.stringify(options, null, 2));

      function check(binName: string): Promise<string> {
        return new Promise((resolve, reject) => {
          let binPath = options[binName];
          fs.stat(binPath, err => {
            err ? reject(err) : resolve(binPath);
          });
        });
      }

      let checks: Promise<string>[] = [];

      if (checkSclang) {
        checks.push(check("sclang"));
      }
      if (checkScsynth) {
        checks.push(check("scsynth"));
      }

      // TODO Promise.all short-circuits on failure
      return Promise.all(checks).then(
        paths => {
          console.log(`Paths OK: ${paths.join(", ")}`);
        },
        error => {
          console.error(`\nExecutable not found: ${error.path}`);
          console.error(error);
          console.log(
            "\nInstall SuperCollider if needed: http://supercollider.github.io/download\n" +
              "If you already have it installed but it is in a non-standard location then edit\n" +
              `${options.sclang_conf}\n` +
              "and specify the paths to sclang and scsynth there.\n" +
              "Then run this test again:\n" +
              "npm run check-install\n",
          );
        },
      );
    })
    .catch(console.error);
}
