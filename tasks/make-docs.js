#!/usr/bin/env node
const Mustache = require("mustache");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { renderDocForName, renderIndexJson } = require("./render-api");

const root = path.resolve(path.join(__dirname, ".."));

const repository = "https://github.com/crucialfelix/supercolliderjs";

const typedocRoot = "https://crucialfelix.github.io/supercolliderjs";

const docsRoot = "https://crucialfelix.github.io/supercolliderjs/#";

// Test locally with:
// TODO: should be a fixed path for each to api.md
// const docsRoot = "http://localhost:3000/#";

const packageNames = async () => {
  const names = (await fsp.readdir(path.join(root, "packages"))).filter(name => name.match(/^[a-z\-]+$/));
  // preferred order
  const nn = ["supercolliderjs", "server", "server-plus", "lang", "dryads", "osc"];
  // add any not already in that list
  names.forEach(n => {
    if (!nn.includes(n)) {
      nn.push(n);
    }
  });

  return nn;
};

async function fileExists(...paths) {
  return fsp.stat(path.join(root, ...paths)).then(
    stat => true,
    err => false,
  );
}

const readFile = (...paths) => fs.readFileSync(path.join(root, ...paths), { encoding: "utf-8" });
const readJson = (...paths) => JSON.parse(readFile(...paths));
const writeFile = (paths, content) => fs.writeFileSync(path.join(root, ...paths), content, { encoding: "utf-8" });

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

const mdLink = (title, links) => `[${title}](${links.join("/")})`;
const isString = thing => typeof thing === "string";

/**
 * Generate _sidebar.md
 * and return
 */
async function generateSidebar(packages) {
  const sb = [];
  sb.push("- " + mdLink("Getting started", ["README.md"]));
  sb.push("- npm packages");
  const autos = {};
  packages.forEach(short => {
    autos[short] = [];

    const index = readJson("packages", short, "index.json");
    const { name } = readJson("packages", short, "package.json");
    sb.push(`  - ${mdLink(name, ["packages", short, "README.md"])}`);
    sb.push(`    - ` + mdLink("API", ["packages", short, "api.md"]));
    // push one for each top level export
    for (const [key, value] of Object.entries(index)) {
      const page = isString(value) ? { title: value, filename: value + ".md" } : { title: key, filename: key + ".md" };
      autos[short].push(page);
      // top level export
      sb.push(`      - ` + mdLink(page.title, ["packages", short, page.filename]));
    }
  });
  sb.push("- Guide");
  sb.push("  - " + mdLink("Guide", ["https://crucialfelix.gitbooks.io/supercollider-js-guide/content/"]));
  sb.push("  - " + mdLink("Examples", ["https://github.com/crucialfelix/supercolliderjs-examples"]));
  const content = sb.join("\n");
  writeFile(["docs", "_sidebar.md"], content);
  return autos;
}

function generateAutodocument(package, { title, filename }) {
  const BBL = "{{";
  const BBR = "}}";
  const BBBL = "{{{";
  const BBBR = "}}}";

  const fullname = filename.replace("_", "/").replace(".md", "");
  const packageLink = `#/packages/${package}/api`;

  const body = `# ${title}
Package: <a href="${packageLink}">${BBBL}name${BBBR}</a>

${BBL}#api${BBR}${package}:${fullname}${BBL}/api${BBR}
`;

  return body;
}

/**
 * Make api.md file for a package
 */
function generateApi(name, short, packages) {
  const index = readJson("packages", short, "index.json");
  // would want to know which file/url to link to for all of these
  // based on the sidebar? you would need a different way to specify pages to make.
  const content = renderIndexJson(index, short, packages);

  const body = `# ${name}

${content}
`;
  writeFile(["docs", "src", "packages", short, "api.md"], body);
}

async function main(version) {
  const packages = await packageNames();
  const pkg = readJson("package.json");

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

  await renderTplPath("docs/src/_coverpage.md", "docs/_coverpage.md", rootData);

  const autos = await generateSidebar(packages);

  for (const pkgdir of packages) {
    const pkg = readJson("packages", pkgdir, "package.json");
    const short = pkg.name.replace("@supercollider/", "");
    const data = {
      ...rootData,
      name: pkg.name,
      short,
      description: pkg.description,
      version: pkg.version,
      homepage: pkg.hompage,
    };

    // Generate api.md file for the module exports
    generateApi(pkg.name, short, packages);

    // Generate autodocument for each entry in autos
    for (const sidebarLink of autos[short] || []) {
      const tplBody = generateAutodocument(short, sidebarLink);
      await renderTpl(tplBody, path.join("docs", "packages", short, sidebarLink.filename), data);
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
