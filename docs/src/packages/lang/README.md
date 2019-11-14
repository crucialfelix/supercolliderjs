{{> header}}

- Spawns and manages one or more `sclang` processes.
- Interpret SuperCollider code and return results as equivalent JavaScript objects.
- Compile SynthDefs written in the SuperCollider language and return byte code.
- Used by atom-supercollider

If you are building something that just needs to communicate with sclang then you can install just this package.

## Usage

### Boot

Start the `sclang` executable as a subprocess, returning a Promise.

{{#example}}examples/boot-lang.js{{/example}}

```js
const Lang = require("supercolliderjs").lang.default;
const l = new Lang(options);
l.boot();
```

`sclang` will compile it's class library, and this may result in syntax or compile errors.

Resolves with a list of SuperCollider class file directories that were compiled:

```typescript
{dirs: [/*compiled directories*/]}
```

or rejects with:

```typescript
{
  dirs: [],
  compileErrors: [],
  parseErrors: [],
  duplicateClasses: [],
  errors[],
  extensionErrors: [],
  stdout: 'compiling class library...etc.'
}
```

See `SclangCompileResult` in `packages/lang/src/internals/sclang-io.ts` for full details.

### Interpret simple async await style

{{#example}}examples/lang-interpret.js{{/example}}

### Interpret with full error handling

{{#example}}examples/lang-interpret-the-long-way.js{{/example}}


### Options

```typescript
sc.lang.boot(options)
// or
const Lang = require("supercolliderjs").lang.default;
const l = new Lang(options);
l.boot();
```

```typescript
{
  // post verbose messages to console
  debug: boolean;
  // echo all commands sent TO sclang to console
  echo: boolean;
  // provide an alternate console like object for logging. eg. winston
  log?: Console;
  // path to sclang executable
  sclang: string;
  // To start sclang and immediately execute one file
  executeFile?: string;
  // path to existing non-default conf file
  sclang_conf?: string;

  // post sclang stdin to console
  stdin: boolean;
  // if specifying a non-default conf file then you may wish to fail if you got the path wrong
  // rather than fall back to the default one
  failIfSclangConfIsMissing: boolean;
  // pass in a configuration without having to write it to a file
  conf: SCLangConf;
}
```

See: packages/lang/src/options.ts


### executeFile

```js
await lang.executeFile("./some-supercollider-piece.scd");
```

{{> footer }}