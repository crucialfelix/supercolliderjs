#!/usr/bin/env node
const Mustache = require("mustache");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;

const root = path.resolve(path.join(__dirname, ".."));
const packagesRoot = path.join(root, "packages");
const docsRoot = path.join(root, "docs");

async function fileExists(filePath) {
  return fsp.stat(filePath).then(stat => true, err => false);
}

const triple = "```";

const partials = {
  header: fs.readFileSync(path.join(root, "docs", "src", "partials", "header.md")).toString(),
  footer: fs.readFileSync(path.join(root, "docs", "src", "partials", "footer.md")).toString(),
};

const example = (text, render) => {
  const body = fs.readFileSync(path.join(root, text));
  return `${triple}js\n${body}\n${triple}`;
};

async function main() {
  const packages = (await fsp.readdir(packagesRoot)).filter(name => name.match(/^[a-z\-]+$/));

  for (const pkgdir of packages) {
    const pkg = JSON.parse(await fsp.readFile(path.join(packagesRoot, pkgdir, "package.json")));

    const tplPath = path.join(root, "docs/src/packages", pkgdir, "README.md");
    if (!(await fileExists(tplPath))) {
      await fsp.mkdir(path.dirname(tplPath), { recursive: true });
      await fsp.writeFile(tplPath, "");
    }
    const tpl = (await fsp.readFile(tplPath)).toString();

    const data = {
      name: pkg.name,
      short: pkg.name.replace("@supercollider/", ""),
      description: pkg.description,
      version: pkg.version,
      homepage: pkg.hompage,
      repository: "https://github.com/crucialfelix/supercolliderjs",
      root: "https://crucialfelix.github.io/supercolliderjs",
      example: () => example,
    };

    const content = Mustache.render(tpl, data, partials);

    // console.log(content);
    // Write to packages for publishing to npm
    await fsp.writeFile(path.join(packagesRoot, pkgdir, "README.md"), content);
    // Write it to docs
    await fsp.writeFile(path.join(docsRoot, "packages", pkgdir, "README.md"), content);
    if (pkgdir === "supercolliderjs") {
      // Is also the main page in docs
      await fsp.writeFile(path.join(docsRoot, "README.md"), content);
    }
  }
}

main().catch(console.error);
