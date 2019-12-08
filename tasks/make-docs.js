#!/usr/bin/env node
const Mustache = require("mustache");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { renderDocForName } = require("./render-api");

const root = path.resolve(path.join(__dirname, ".."));
const packagesRoot = path.join(root, "packages");
const docsSrc = path.join(root, "docs", "src", "packages");

// const docsRoot = path.join(root, "docs");
const repository = "https://github.com/crucialfelix/supercolliderjs";

const typedocRoot = "https://crucialfelix.github.io/supercolliderjs";

// Test locally with:
const docsRoot = "http://localhost:3000/#";

const packageNames = async () => (await fsp.readdir(packagesRoot)).filter(name => name.match(/^[a-z\-]+$/));
async function fileExists(filePath) {
  return fsp.stat(filePath).then(
    stat => true,
    err => false,
  );
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
const renderApi = text => {
  const [package, name] = text.split(":", 2);
  return renderDocForName(package, name);
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

async function parseSidebar() {
  // auto generate md files if they are listed in the sidebar
  const sidebar = await fsp.readFile(path.join(root, "docs", "_sidebar.md"), { encoding: "utf8" });
  const autos = {};
  function pushAuto(package, title, filename) {
    if (!autos[package]) {
      autos[package] = [];
    }
    autos[package].push({ title, filename });
  }
  const re = /\[(.+)\]\(packages\/([a-z\-_]+)\/([^)]+)\)/;
  for (const line of sidebar.split("\n")) {
    // if has []()
    // if file is not README
    //
    const match = line.match(re);
    if (match) {
      const title = match[1];
      const package = match[2];
      const filename = match[3];
      if (filename !== "README.md") {
        pushAuto(package, title, filename);
      }
    }
  }
  return autos;
}

function generateAutodocument(package, { title, filename }) {
  const BBL = "{{";
  const BBR = "}}";
  const BBBL = "{{{";
  const BBBR = "}}}";

  const p = path.join(docsSrc, package, filename);
  const fullname = filename.replace("_", "/").replace(".md", "");
  console.log({ filename, fullname, title, package });

  const body = `# ${BBBL}name${BBBR} ${title}

${BBL}#api${BBR}${package}:${fullname}${BBL}/api${BBR}
`;

  console.log({ body, p });

  fs.writeFileSync(p, body, { encoding: "utf-8" });
}

async function main(version) {
  const packages = await packageNames();

  const pkg = JSON.parse(await fsp.readFile(path.join(root, "package.json")));

  const rootData = {
    name: pkg.name,
    short: pkg.name.replace("@supercollider/", ""),
    description: pkg.description,
    version: version || pkg.version,
    homepage: pkg.hompage,
    repository,
    docsRoot,
    typedocRoot,
    example: () => example,
    typedocLink: () => typedocLink,
    api: () => renderApi,
  };

  // _coverpage
  await make("docs/src/_coverpage.md", "docs/_coverpage.md", rootData);

  const autos = await parseSidebar();

  for (const pkgdir of packages) {
    const pkg = JSON.parse(await fsp.readFile(path.join(packagesRoot, pkgdir, "package.json")));
    const short = pkg.name.replace("@supercollider/", "");
    const data = {
      ...rootData,
      name: pkg.name,
      short,
      description: pkg.description,
      version: pkg.version,
      homepage: pkg.hompage,
    };

    // generate autodocument for each entry in sidebar
    for (const sidebarLink of autos[short] || []) {
      generateAutodocument(short, sidebarLink);
    }

    for (const filename of fs.readdirSync(path.join("docs/src/packages", pkgdir))) {
      if (filename.endsWith(".md")) {
        const tplPath = path.join("docs/src/packages", pkgdir, filename);

        // Write it to docs
        await make(tplPath, path.join("docs/packages", pkgdir, filename), data);

        if (filename === "README.md") {
          // Write to packages for publishing to npm
          await make(tplPath, path.join("packages", pkgdir, filename), data);

          if (pkgdir === "supercolliderjs") {
            // Is also the main page in docs
            await make(tplPath, path.join("docs", "README.md"), data);
            // and main page on github
            await make(tplPath, "README.md", data);
          }
        }
      }
    }
  }
}

main(process.argv[2]).catch(console.error);
