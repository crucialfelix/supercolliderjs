#!/usr/bin/env node
const Mustache = require("mustache");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;

const root = path.resolve(path.join(__dirname, ".."));
const packagesRoot = path.join(root, "packages");
const docsRoot = path.join(root, "docs");
const repository = "https://github.com/crucialfelix/supercolliderjs";

const typedocRoot = "https://crucialfelix.github.io/supercolliderjs";

// Test locally with:
// const typedocRoot = "http://localhost:3000";

async function fileExists(filePath) {
  return fsp.stat(filePath).then(stat => true, err => false);
}

const triple = "```";

const partials = {
  header: fs.readFileSync(path.join(root, "docs", "src", "partials", "header.md")).toString(),
  footer: fs.readFileSync(path.join(root, "docs", "src", "partials", "footer.md")).toString(),
};

// template lambdas
const example = text => {
  const body = fs.readFileSync(path.join(root, text));
  const link = `${repository}/blob/develop/${text}`;
  return `${triple}js\n${body}\n${triple}\n<small class="source-link"><a href=${link}>source</a></small>\n`;
};
const typedocLink = text => {
  const [title, link] = text.split(":", 2);
  const body = `[${title}](${typedocRoot}${link})`;
  return body;
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
      repository,
      typedocRoot: typedocRoot,
      example: () => example,
      typedocLink: () => typedocLink,
    };

    const content = Mustache.render(tpl, data, partials);

    // Write to packages for publishing to npm
    await fsp.writeFile(path.join(packagesRoot, pkgdir, "README.md"), content);
    // Write it to docs
    await fsp.writeFile(path.join(docsRoot, "packages", pkgdir, "README.md"), content);
    if (pkgdir === "supercolliderjs") {
      // Is also the main page in docs
      await fsp.writeFile(path.join(docsRoot, "README.md"), content);
      // and main page on github
      await fsp.writeFile(path.join(root, "README.md"), content);
    }
  }
}

main().catch(console.error);
