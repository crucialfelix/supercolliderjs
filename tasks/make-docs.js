#!/usr/bin/env node
const Mustache = require("mustache");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { renderDocForName } = require("./render-api");

const root = path.resolve(path.join(__dirname, ".."));

const repository = "https://github.com/crucialfelix/supercolliderjs";

const typedocRoot = "https://crucialfelix.github.io/supercolliderjs";

// Test locally with:
// TODO: should be a fixed path for each to api.md
const docsRoot = "http://localhost:3000/#";

const packageNames = async () =>
  (await fsp.readdir(path.join(root, "packages"))).filter(name => name.match(/^[a-z\-]+$/));

async function fileExists(...paths) {
  return fsp.stat(path.join(root, ...paths)).then(
    stat => true,
    err => false,
  );
}

const readFile = (...paths) => fs.readFileSync(path.join(root, ...paths), { encoding: "utf-8" });

const triple = "```";

const partials = {
  header: readFile("docs", "src", "partials", "header.md"),
  footer: readFile("docs", "src", "partials", "footer.md"),
};

/**
 * Insert an example from /examples/
 */
const example = text => {
  const body = readFile(text);
  const link = `${repository}/blob/develop/${text}`;
  return `${triple}js\n${body}\n${triple}\n<small class="source-link"><a href=${link}>source</a></small>\n`;
};
/**
 * Insert a link to the TypeDocs page.
 * This was used when typedocs was rendered with it's default html export.
 *
 * @deprecated
 * @param {*} text
 */
const typedocLink = text => {
  const [title, link] = text.split(":", 2);
  const body = `[${title}](${typedocRoot}${link})`;
  return body;
};
/**
 * Render Typedocs for an entity in package
 * Entity can be the name of a module, class, function, interface etc.
 * It searches down the API by name or "name" (with added quotes to detect module names).
 * @param {*} text package:EntityName
 */
const renderApi = text => {
  const [package, name] = text.split(":", 2);
  return renderDocForName(package, name);
};

async function renderTplPath(srcPath, destPath, data) {
  const absTplPath = path.join(root, srcPath);
  if (!(await fileExists(srcPath))) {
    await fsp.mkdir(path.dirname(absTplPath), { recursive: true });
    await fsp.writeFile(absTplPath, "");
  }
  const tpl = readFile(srcPath);
  return renderTpl(tpl, destPath, data);
}

async function renderTpl(tpl, destPath, data) {
  const content = Mustache.render(tpl, data, partials);
  await fsp.writeFile(path.join(root, destPath), content);
}

async function parseSidebar() {
  // auto generate md files if they are listed in the sidebar
  const sidebar = readFile("docs", "_sidebar.md");
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
      // or api?
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

  const fullname = filename.replace("_", "/").replace(".md", "");
  console.log({ filename, fullname, title, package });

  const body = `# ${BBBL}name${BBBR} ${title}

${BBL}#api${BBR}${package}:${fullname}${BBL}/api${BBR}
`;

  return body;
}

async function main(version) {
  const packages = await packageNames();

  const pkg = JSON.parse(readFile("package.json"));

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
  await renderTplPath("docs/src/_coverpage.md", "docs/_coverpage.md", rootData);

  const autos = await parseSidebar();

  for (const pkgdir of packages) {
    const pkg = JSON.parse(readFile("packages", pkgdir, "package.json"));
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
      if (!(await fileExists("docs/src/packages", short, sidebarLink.filename))) {
        const tplBody = generateAutodocument(short, sidebarLink);
        await renderTpl(tplBody, path.join("docs", "packages", pkgdir, sidebarLink.filename), data);
      }
    }

    for (const filename of fs.readdirSync(path.join("docs/src/packages", pkgdir))) {
      if (filename.endsWith(".md")) {
        const tplPath = path.join("docs/src/packages", pkgdir, filename);

        // Write it to docs
        await renderTplPath(tplPath, path.join("docs/packages", pkgdir, filename), data);

        if (filename === "README.md") {
          // Write to packages for publishing to npm
          await renderTplPath(tplPath, path.join("packages", pkgdir, filename), data);

          if (pkgdir === "supercolliderjs") {
            // Is also the main page in docs
            await renderTplPath(tplPath, path.join("docs", "README.md"), data);
            // and main page on github
            await renderTplPath(tplPath, "README.md", data);
          }
        }
      }
    }
  }
}

main(process.argv[2]).catch(console.error);
