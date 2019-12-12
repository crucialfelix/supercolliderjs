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
  },
  supercolliderjs: {
    server: {
      package: "server-plus",
      name: "ServerPlus", // actually the whole package
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
    },
    msg: {
      package: "server",
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
    const goto = {
      package,
      name,
      ...redirected,
    };
    return find(goto.package, loadApi(goto.package), goto.name);
  }

  // ignore a property with that name: it is perhaps an export
  // or just a parent class that holds the thing we are searching for.
  if (node.name === name && node.kindString !== "Property") {
    return node;
  }
  // console.log(node);
  if (!node.children) return;
  for (const child of node.children) {
    const cn = find(package, child, name);
    if (cn) {
      return cn;
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

const el = (element, body, attrs = "") => `<${element} ${attrs}>${body}</${element}>`;
// const el = (element, attrs = {}) => body => `<${element} ${attrs}>${body}</${element}>`;

const h4 = (txt, id = "") => `<h4 id="ref-${id}">${txt}</h4>`;
const span = (txt, className = "") => `<span class="${className}">${txt}</span>`;
const div = (txt, className = "") => `<div class="${className}">${txt}</div>`;
const ul = (lis, className = "no-dot") =>
  `<ul class="${className}">` + join(...lis.map(li => `<li>${li}</li>`)) + "</ul>";

const shortText = txt => txt && el("p", txt);
const text = txt => txt && el("p", txt); // It's markdown, needs to be processed
const returns = txt => txt && `Returns ${txt}`;

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
      return sigs ? type(sigs[0].type) : "reflection";
    }
    case "intersection": {
      return obj.types.map(type).join(" &amp; ");
    }
    default:
      console.error(obj);

      throw new Error("Render type: unknown type:" + obj.type);
  }
};

// TODO
// sources
// flags

const private = name => `<!-- private ${name} -->`;

const comment = c => {
  return c && join(shortText(c.shortText), text(c.text), returns(c.returns));
};

const Class = node => {
  const xs = node.extendedTypes ? joinc(node.extendedTypes.map(type)) : null;

  return div(
    join(
      `<h3 class="class-header" id="${node.name}">class <span class="class">${node.name}</span></h3>`,
      xs && `extends: ${xs}`,
      comment(node.comment),
      ...node.children.map(renderNode),
    ),
    "Class",
  );
};

const Property = node => {
  if (node.flags && node.flags.isPrivate) {
    return private(node.name);
  }
  if (node.inheritedFrom) {
    // or show mini with link
    return null;
  }

  // flags: static
  const header = h4(span(node.name, "token property") + " " + type(node.type), node.id);
  return joinnl([header, comment(node.comment)]);
};

const Accessor = node => {
  if (node.flags && node.flags.isPrivate) {
    return private(node.name);
  }
  const ty = node.getSignature[0].type;
  return join(h4(span(node.name, "token property") + " " + type(ty), node.id), comment(node.comment));
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
  return join(h4(functionTitle(signature), node.id), comment(signature.comment));
};

const Constructor = node => {
  return Method(node);
};

const Parameter = parameter => {
  const p = `${parameter.name}: ${type(parameter.type)}`;
  if (parameter.defaultValue) {
    return `${p} = ${parameter.defaultValue}`;
  }
  return p;
};

const functionParameters = parameters => {
  return `(${joinWith((parameters || []).map(Parameter), ", ")})`;
};
const functionTitle = signature => {
  return `${span(signature.name, "token function")}${functionParameters(signature.parameters)}: ${type(
    signature.type,
  )}`;
};
// bigger with all params and comments
const CallSignature = signature => {
  return join(functionTitle(signature), comment(signature.comment));
  // TODO flags
  // TODO breakout parameters that have comments and types
};

const nodeSummary = node => `${node.kindString} ${node.name}`;
// pre({ name: node.name, kindString: node.kindString, comment: comment(node.comment) });
// const nodeSummary = node => pre({ name: node.name, kindString: node.kindString, comment: comment(node.comment) });

const ExternalModule = node => {
  if (node.children) {
    return div(
      join(
        `${span("module", "token keyword")} ${node.name}`,
        ...node.children
          .map(node.children.length > 100 ? nodeSummary : renderNode)
          .map(html => div(html, "module-child")),
      ),
      "module",
    );
  }

  // modules that only have exports do not have any children in api.json
  // only a sources

  return div(joins(span("module", "token keyword"), node.name), "Module");
  // direct exports are not exposed in the typedocs json:
  // export { SCLangError } from "@supercollider/lang";
  // return `Empty module ${JSON.stringify(node)}`;
};

const indexEntry = node => {
  if (node.kindString === "External module") {
    return ExternalModule(node);
  }
  return `${node.kindString} ${node.name}`;
};

const Index = node => {
  return div(join(h4(node.name, node.id), ul(node.children.map(indexEntry))), "Index");
};

const Interface = node => {
  const children = (node.children || []).map(renderNode);
  return div(join(h4(joins(span("interface", "token keyword"), node.name), node.id), ul(children)), "Interface");
};

const TypeAlias = node => {
  return div(`${span("type", "token keyword")} ${node.name} = ${type(node.type)};`, "TypeAlias");
};

const Enumeration = node => {
  return div(
    join(
      h4(joins(span("enum", "token keyword"), node.name), node.id),
      ul(node.children.map(child => joins(child.name, "=", child.defaultValue))),
      comment(node.comment),
    ),
    "Enum",
  );
};

const ObjectLiteral = node => {
  return join(h4(joins(span(node.name, "token variable"), "= {")), ...ul(node.children.map(renderNode)), "}");
};

const Variable = node => {
  return joins(span(node.name, "token property"), ":", type(node.type), "=", node.defaultValue);
};

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
  return renderNode(node);
}

/**
 * Render the index.json files as single page
 */
const renderIndexJson = kv => apiValue(kv);

const isString = v => typeof v === "string";

const apiLink = name => span(name, "link token property");
const apiKey = k => span(k, "token property");
const apiValue = v => (isString(v) ? apiLink(v) : ul(Object.entries(v).map(apiKeyValue)));
const apiKeyValue = ([k, v]) => (isString(v) ? apiLink(v) : join(apiKey(k), apiValue(v)));

module.exports = {
  renderDocForName,
  renderIndexJson,
};
