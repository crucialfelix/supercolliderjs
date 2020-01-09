/**
 * Typedocs does not detect a module's exports.
 * I should see if I can fix that.
 *
 * This script loads the index file for a package
 * and converts the exports to a nested tree of names
 * and saves this as index.json
 */
const fs = require("fs");
const self = require(process.cwd() + "/");

const asNames = (object, name) => {
  if (!typeof object === "object") {
    return name;
  }

  if (Array.isArray(object)) {
    return object.map((x, i) => asNames(x, String(i)));
  }

  if (isPlainObject(object)) {
    const mapped = {};
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const element = object[key];
        const name = asNames(element, key);
        // const emptyObject = name && (name.constructor === Object || Object.entries(name).length === 0);
        if (name) {
          mapped[key] = name;
        }
      }
    }
    return mapped;
  }
  // if has no name then it is an instrinsic
  return object.name;
};

const result = asNames(self);
const json = JSON.stringify(result, null, 2);
fs.writeFileSync("./index.json", json);

// https://github.com/jonschlinkert/is-plain-object/blob/master/index.js
function isObjectObject(o) {
  return isObject(o) === true && Object.prototype.toString.call(o) === "[object Object]";
}

function isPlainObject(o) {
  if (isObjectObject(o) === false) return false;

  // If has modified constructor
  const ctor = o.constructor;
  if (typeof ctor !== "function") return false;

  // If has modified prototype
  const prot = ctor.prototype;
  if (isObjectObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty("isPrototypeOf") === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

// https://github.com/jonschlinkert/isobject/blob/master/index.js
function isObject(val) {
  return val != null && typeof val === "object" && Array.isArray(val) === false;
}
