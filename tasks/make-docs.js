#!/usr/bin/env node
const Mustache = require("mustache");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;

const root = path.resolve(path.join(__dirname, ".."));
const packagesRoot = path.join(root, "packages");
// const docsRoot = path.join(root, "docs");
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

async function make(srcPath, destPath, data) {
  const tplPath = path.join(root, srcPath);
  if (!(await fileExists(tplPath))) {
    await fsp.mkdir(path.dirname(tplPath), { recursive: true });
    await fsp.writeFile(tplPath, "");
  }
  const tpl = (await fsp.readFile(tplPath)).toString();
  const content = Mustache.render(tpl, data, partials);
  await fsp.writeFile(path.join(root, destPath), content);
}

async function main(version) {
  const packages = (await fsp.readdir(packagesRoot)).filter(name => name.match(/^[a-z\-]+$/));

  const pkg = JSON.parse(await fsp.readFile(path.join(root, "package.json")));

  const rootData = {
    name: pkg.name,
    short: pkg.name.replace("@supercollider/", ""),
    description: pkg.description,
    version: version || pkg.version,
    homepage: pkg.hompage,
    repository,
    typedocRoot: typedocRoot,
    example: () => example,
    typedocLink: () => typedocLink,
  };

  // _coverpage
  await make("docs/src/_coverpage.md", "docs/_coverpage.md", rootData);

  for (const pkgdir of packages) {
    const pkg = JSON.parse(await fsp.readFile(path.join(packagesRoot, pkgdir, "package.json")));

    const data = {
      ...rootData,
      name: pkg.name,
      short: pkg.name.replace("@supercollider/", ""),
      description: pkg.description,
      version: pkg.version,
      homepage: pkg.hompage,
    };

    const tplPath = path.join("docs/src/packages", pkgdir, "README.md");

    // Write to packages for publishing to npm
    await make(tplPath, path.join("packages", pkgdir, "README.md"), data);
    // Write it to docs
    await make(tplPath, path.join("docs/packages", pkgdir, "README.md"), data);

    if (pkgdir === "supercolliderjs") {
      // Is also the main page in docs
      await make(tplPath, path.join("docs", "README.md"), data);
      // and main page on github
      await make(tplPath, "README.md", data);
    }
  }
}

main(process.argv[2]).catch(console.error);
