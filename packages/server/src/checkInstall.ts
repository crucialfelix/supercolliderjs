/* eslint no-console: 0 */
import { resolveOptions } from "./options";
import fs from "fs";

/**
 * Check that scsynth executable exists.
 *
 * This can be called in a postInstall step for a package
 * to inform the user if it can or cannot find scsynth.
 *
 * Posts the options to console.
 * Posts errors and any information it can find to help
 * the user.
 */
export default function checkInstall(): Promise<boolean> {
  console.log("Checking supercollider.js@server install...");
  const options = resolveOptions({});
  // console.log("Default options:");
  // console.log(JSON.stringify(options, null, 2));

  function check(binName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const binPath = options[binName];
      fs.stat(binPath, (err) => {
        err ? reject(err) : resolve(binPath);
      });
    });
  }

  return check("scsynth").then(
    path => {
      console.log(`Executable OK: ${path}`);
      return true;
    },
    error => {
      console.error(`\nExecutable not found: ${error.path}`);
      console.error(error);
      console.log(`
Install SuperCollider if needed:
http://supercollider.github.io/download
If you already have it installed but it is in a non-standard location then edit .supercollider.yaml and specify the path to scsynth there.
Then run this test again:
npm run check-install
`
      );
      return false;
    },

  );

}

if (require.main === module) {
  checkInstall().then(() => process.exit(0), () => process.exit(1));
}
