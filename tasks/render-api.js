const path = require("path");
const fs = require("fs");

const root = path.resolve(path.join(__dirname, ".."));
const packagesRoot = path.join(root, "docs", "src", "packages");

const redirects = {
  server: {
    msg: {
      package: "server",
      name: `"osc/msg"`,
    },
    // quit: {
    //   name: "msg.quit"
    // }
  },
  supercolliderjs: {
    server: {
      package: "server-plus",
      name: "ServerPlus", // actually the whole package
    },
    ServerState: {
      package: "server",
      name: "ServerState",
    },
    map: {
      package: "server",
      name: "mapping",
    },
    '"map"': {
      package: "server",
      name: "mapping",
    },
    resolveOptions: {
      package: "server",
      name: "resolveOptions",
    },
    SCLangError: {
      package: "lang",
      name: "SCLangError",
    },
    msg: {
      package: "server",
      name: "msg",
    },
    dryads: {
      package: "dryads",
      name: '"index"',
    },
    lang: {
      package: "lang",
      name: '"index"',
    },
  },
  // 'server-plus': {
  //   boot:
  // }
};

const apis = {};

function loadApi(package) {
  if (!apis[package]) {
    apis[package] = JSON.parse(fs.readFileSync(path.join(packagesRoot, package, "api.json")));
  }
  return apis[package];
}

const indexes = {};
function loadIndex(package) {
  if (!indexes[package]) {
    indexes[package] = JSON.parse(fs.readFileSync(path.join(root, "packages", package, "index.json")));
  }
  return indexes[package];
}

/**
 * Breadth first search of a node tree
 */
function* bfs(node) {
  const stack = [node];
  while (stack.length) {
    const next = stack.pop();
    yield next;
    if (next.children) {
      stack.push(...next.children);
    }
  }
}

/**
 * Find a TypeDoc node by name.
 *
 * Names in one package can be redirected to another name or package.
 * eg. supercollider.server => server-plus/index
 *
 * @param {string} package - name of package
 * @param {*} node -         typedoc node to search recursively
 * @param {*} name  - name of node (method, class, module etc) you are looking for
 * @returns node | undefined
 */
function find(package, node, name) {
  const redirected = redirects[package] && redirects[package][name];
  if (redirected) {
    // default a redirect to this package, this name
    // so you don't have to specify the whole thing.
    // just makes it more complex actually
    // But you need this to redirect supercolliderjs exports
    // to the packages that have the code.
    const goto = {
      package,
      name,
      ...redirected,
    };
    return find(goto.package, loadApi(goto.package), goto.name);
  }

  const foundIt = n => {
    // ignore a property with that name: it is perhaps an export
    // or just a parent class that holds the thing we are searching for.
    if (n.name === name && n.kindString !== "Property") {
      return n;
    }
    if (n.kindString === "External module" && n.name === `"${name}"`) {
      return n;
    }
  };

  for (const next of bfs(node)) {
    if (foundIt(next)) {
      return next;
    }
  }
}

const json = obj => JSON.stringify(obj, null, 2);
const pre = obj => `<pre>${json(obj)}</pre>\n`;

const joinWith = (lines, joiner = "\n\n") => lines.filter(l => !!l).join(joiner);
const join = (...lines) => joinWith(lines, "");
const joinc = lines => joinWith(lines, ", ");
const joins = (...lines) => joinWith(lines, " ");
const joinnl = lines => joinWith(lines, "\n");

// const el = (element, body, attrs = "") => `<${element} ${attrs}>${body}</${element}>`;
// const el = (element, attrs = {}) => body => `<${element} ${attrs}>${body}</${element}>`;

const h4 = (txt, id = "") => `<h4 id="${id}">${txt}</h4>`;
const span = (txt, className = "") => `<span class="${className}">${txt}</span>`;
const div = (txt, className = "") => `<div class="${className}">${txt}</div>`;
const p = (txt, className = "") => (txt ? `<p class="${className}">${txt}</p>` : "");
const ul = (lis, className = "no-dot") =>
  `<ul class="${className}">` + join(...lis.map(li => `<li>${li}</li>`)) + "</ul>";

const shortText = txt => p(txt, "short-text"); // txt && el("p", txt);
const text = txt => p(txt); // It's markdown, needs to be processed
const returns = txt => {
  if (txt && txt.trim()) {
    return div(`Returns ${txt.trim()}`);
  }
};
const ahref = (href, body) => `<a href="${href}">${body}</a>`;
const token = (name, tokenType) => span(name, `token ${tokenType}`);

/**
 * Render a type definition
 */
const type = obj => {
  const tc = (name, className = "") => span(name, `type ${className}`);

  if (!obj) return "";
  switch (obj.type) {
    case "intrinsic":
      // function token function
      // token boolean string
      return tc(obj.name, "token entity");
    case "reference": {
      // can link to it if it has an id
      // or link to other package if known
      let name = obj.name;
      if (obj.typeArguments) {
        name += `&lt;${joinc(obj.typeArguments.map(type))}&gt;`;
      }

      const span = tc(name, obj.type);
      // hard to link to a ref on this page without knowing
      // the base url
      // if (obj.id) {
      //   return `<a href="?id=ref-${obj.id}">${span}</a>`;
      // }
      // may be able to link to the other package
      return span;
    }
    case "array":
      return tc(obj.elementType) + "[]";
    case "union":
      return tc(obj.types.map(type).join(" | "));
    case "tuple":
      return `[${tc(obj.elements.map(type).join(", "))}]`;
    case "reflection": {
      // may have a reference inside this
      // indexSignature
      // signatures
      const sigs = obj.declaration.indexSignature || obj.declaration.signatures;
      if (!sigs) {
        console.log("reflection:", obj);
      }
      return sigs ? type(sigs[0].type) : "reflection";
    }
    case "intersection": {
      return obj.types.map(type).join(" &amp; ");
    }
    case "typeParameter": {
      return obj.name;
    }
    default:
      console.error(obj);

      throw new Error("Render type: unknown type:" + obj.type);
  }
};

// TODO
// sources
// flags

const private = name => null; // `<!-- private ${name} -->`;

const comment = c => {
  return c && join(shortText(c.shortText), text(c.text), returns(c.returns));
};

const Class = node => {
  // TODO: use apiLink
  const xs = node.extendedTypes ? joinc(node.extendedTypes.map(type)) : null;

  const renderChild = child => div(renderNode(child), "class-member");

  // group by kindString
  const children = [];
  let kind = null;
  node.children.forEach(child => {
    if (child.kindString !== kind) {
      children.push(div(child.kindString, "section-heading"));
      kind = child.kindString;
    }
    console.log(kind, renderChild(child));

    children.push(renderChild(child));
  });

  return div(
    join(
      `<h3 class="class-header" id="${node.name}">${token("class", "keyword")} <span class="class">${
        node.name
      }</span></h3>`,
      xs && joins(token("extends", "keyword"), xs),
      comment(node.comment),
      ...children,
    ),
    "Class",
  );
};

const Property = node => {
  if (node.flags && node.flags.isPrivate) {
    return private(node.name);
  }
  // if (node.inheritedFrom) {
  //   return div(node.name, "inherited");
  //   // or show mini with link
  //   // return null;
  // }

  // flags: static
  const header = h4(token(node.name, "property") + " " + type(node.type), node.name);
  return joinnl([header, comment(node.comment)]);
};

const Accessor = node => {
  if (node.flags && node.flags.isPrivate) {
    return private(node.name);
  }
  const ty = node.getSignature[0].type;
  return join(h4(token(node.name, "property") + " " + type(ty), node.name), comment(node.comment));
};

const Method = node => {
  if (node.flags && node.flags.isPrivate) {
    return private(node.name);
  }
  if (node.inheritedFrom) {
    // or show mini with link
    return null;
  }
  const signature = node.signatures[0];
  return join(h4(functionTitle(signature), node.name), comment(signature.comment));
};

const Constructor = node => {
  return Method(node);
};

const Parameter = parameter => {
  const p = `${parameter.name}: ${type(parameter.type)}`;
  if (parameter.defaultValue) {
    return span(`${p} = ${parameter.defaultValue}`, "nowrap");
  }
  return span(p, "nowrap");
};

const functionParameters = parameters => {
  return `(${joinWith((parameters || []).map(Parameter), ", ")})`;
};
const functionTitle = signature => {
  return `${token(signature.name, "function")}${functionParameters(signature.parameters)}: ${type(signature.type)}`;
};
// bigger with all params and comments
const CallSignature = signature => {
  return join(functionTitle(signature), comment(signature.comment));
  // TODO flags
  // TODO breakout parameters that have comments and types
};

const nodeSummary = node => `${kindString(node.kindString)} ${node.name}`;
// pre({ name: node.name, kindString: node.kindString, comment: comment(node.comment) });
// const nodeSummary = node => pre({ name: node.name, kindString: node.kindString, comment: comment(node.comment) });

const stripQuotes = str => str && str.replace(/"/g, "");

const ExternalModule = node => {
  // if __tests__ in node.name then ignore
  if (/__tests__/.exec(node.name)) {
    return "";
  }

  const name = stripQuotes(node.name);

  if (node.children) {
    // if only one then display it without wrapping it in a module
    if (node.children.length === 1) {
      return join(...node.children.map(renderNode).map(html => div(html, "entity-box")));
    }

    return div(
      join(
        `${token("module", "keyword")} ${name}`,
        ...node.children
          .map(node.children.length > 100 ? nodeSummary : renderNode)
          .map(html => div(html, "module-child entity-box")),
      ),
      "module",
    );
  }

  // modules that only have exports do not have any children in api.json
  // only a sources

  return div(joins(token("module", "keyword"), name), "Module");
  // direct exports are not exposed in the typedocs json:
  // export { SCLangError } from "@supercollider/lang";
  // return `Empty module ${JSON.stringify(node)}`;
};

const indexEntry = node => {
  if (node.kindString === "External module") {
    return ExternalModule(node);
  }
  return `${kindString(node.kindString)} ${node.name}`;
};

const Index = node => {
  return div(join(h4(node.name, node.name), ul(node.children.map(indexEntry))), "Index");
};

const Interface = node => {
  const children = (node.children || []).map(renderNode);
  return div(join(h4(joins(token("interface", "keyword"), node.name), node.name), ul(children)), "Interface");
};

const TypeAlias = node => {
  return div(`${span("type", "token keyword")} ${node.name} = ${type(node.type)};`, "TypeAlias");
};

const Enumeration = node => {
  return div(
    join(
      h4(joins(token("enum", "keyword"), node.name), node.name),
      ul(node.children.map(child => joins(child.name, "=", child.defaultValue))),
      comment(node.comment),
    ),
    "Enum",
  );
};

const ObjectLiteral = node => {
  return join(h4(joins(token(node.name, "variable"), "= {")), ...ul(node.children.map(renderNode)), "}");
};

const Variable = node => {
  return joins(token(node.name, "property"), ":", type(node.type), "=", node.defaultValue);
};

const kindString = str => (str === "External module" ? "module" : str);

const Function = Method;

// [node.kindString] : function
const renderers = {
  default: pre,
  Class,
  Constructor,
  Property,
  Variable,
  Accessor,
  Method,
  Function,
  Parameter,
  Interface,
  Enumeration,
  "Object literal": ObjectLiteral,
  "Type alias": TypeAlias,
  "Call signature": CallSignature,
  "Constructor signature": CallSignature,
  "External module": ExternalModule,
  // kind: 0 is the top root of typedocs's api.json
  0: Index,
};

function renderNode(node) {
  const fn = renderers[node.kindString || node.kind] || renderers.default;
  return (fn(node) || "").trim();
}

/**
 * Render content for a page.md from package and entity name
 */
function renderDocForName(package, name) {
  const api = loadApi(package);
  // findWithRedirects
  let node = find(package, api, name);
  if (!node) {
    if (!name.startsWith(`"`)) {
      node = find(package, api, `"${name}"`);
    }
  }
  if (!node) {
    console.error(`ERROR: Unable to find an entry for name:"${name}" in package:${package} api.json`);
    // console.log(JSON.stringify(namesInApi(api), null, 2));
    // throw new Error();
    return null;
  }

  // if node is an external module and package then render that.
  // this is when a package re-exports another package
  if (name !== "index" && node.name === `"index"` && node.kindString === "External module") {
    const a = loadApi(name);
    if (a) {
      return renderNode(a);
    }
  }

  const body = renderNode(node);
  // If this node is not an module, then wrap the individual item as though it were.
  if (node.kindString !== "External module") {
    return div(body, "entity-box");
  }
  return body;
}

function* indexBfs(node) {
  const stack = [node];
  while (stack.length) {
    const next = stack.pop();
    if (isString(next)) {
      yield next;
    } else {
      stack.push(...Object.values(next));
    }
  }
}

/**
 * Render the index.json files as single page
 */
const renderIndexJson = (kv, package, packages) => {
  const api = loadApi(package);

  const pageForName = (package, name) => {
    const index = loadIndex(package);
    // Return the first top level branch (branch.md contains docs)
    // that contains an entity with this name
    for (const branchName of Object.keys(index)) {
      const branch = index[branchName];
      if (isString(branch) && branch === name) {
        // return the leaf "Server", not the key "default"
        return branch;
      }
      // if it is a top level and the value is a string then you already have it

      for (const leaf of indexBfs(branch)) {
        if (leaf === name) {
          return `${branchName}?id=${name}`;
        }
      }
    }
  };

  const apiLink = name => {
    const renderApiLink = (node, link) =>
      ahref(
        link,
        joins(
          span(kindString(node.kindString).toLowerCase(), "token keyword"),
          span(node.name, kindString(node.kindString)),
        ),
      );

    const buildLink = (pkg, name) => {
      const n = stripQuotes(name);
      const page = pageForName(pkg, n) || `api?id=${stripQuotes(name)}`;
      return `#/packages/${pkg}/${page}`;
    };

    const node = find(package, api, name);

    if (node) {
      return renderApiLink(node, buildLink(package, node.name));
    }

    // search through the others
    for (const p of packages) {
      const n = find(p, loadApi(p), name);
      if (n) {
        return renderApiLink(n, buildLink(p, n.name));
      }
    }
    // Cannot find it. Maybe it is a module
    return span(name, "link token property");
  };
  const apiKey = k => span(k, "token property");
  const apiValue = v => (isString(v) ? apiLink(v) : ul(Object.entries(v).map(apiKeyValue)));
  const apiKeyValue = ([k, v]) => (isString(v) ? apiLink(v) : join(apiKey(k), apiValue(v)));

  return apiValue(kv);
};

const isString = v => typeof v === "string";

module.exports = {
  renderDocForName,
  renderIndexJson,
};
