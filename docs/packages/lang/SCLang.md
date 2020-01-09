# SCLang
Package: <a href="#/packages/lang/api">@supercollider/lang</a>

<div class="entity-box"><div class="Class"><h3 class="class-header" id="SCLang"><span class="token keyword">class</span> <span class="class">SCLang</span></h3><span class="token keyword">extends</span> <span class="type reference">EventEmitter</span><p class="short-text">This class manages a supercollider language interpreter process
and sends messages to and from it using STDIN / STDOUT.</p><p class=""> SuperCollider comes with an executable called sclang
 which can be communicated with via stdin/stdout
 or via OSC.
</p><div class="section-heading">Constructor</div><div class="class-member"><h4 id="constructor"><span class="token function">new SCLang</span>(<span class="nowrap">options: <span class="type reference">SCLangArgs</span></span>): <span class="type reference">SCLang</span></h4></div><div class="section-heading">Property</div><div class="class-member"><h4 id="log"><span class="token property">log</span> <span class="type reference">Logger</span></h4></div><div class="class-member"><h4 id="options"><span class="token property">options</span> <span class="type reference">SCLangOptions</span></h4></div><div class="class-member"><h4 id="process"><span class="token property">process</span> <span class="type reference">ChildProcess</span></h4></div><div class="class-member"><h4 id="stateWatcher"><span class="token property">stateWatcher</span> <span class="type reference">SclangIO</span></h4></div><div class="class-member"><h4 id="boot"><span class="token property">boot</span> <span class="type reference">boot</span></h4></div><div class="class-member"><h4 id="defaultMaxListeners"><span class="token property">defaultMaxListeners</span> <span class="type token entity">number</span></h4></div><div class="section-heading">Method</div><div class="class-member"><h4 id="_spawnProcess"><span class="token function">_spawnProcess</span>(<span class="nowrap">execPath: <span class="type token entity">string</span></span>, <span class="nowrap">commandLineOptions: <span class="type ">[object Object]</span>[]</span>): <span class="type reference">ChildProcess</span></h4></div><div class="class-member"></div><div class="class-member"><h4 id="args"><span class="token function">args</span>(<span class="nowrap">options: reflection</span>): <span class="type ">[object Object]</span>[]</h4><p class="short-text">command line args for sclang</p><p class="">```
  -d <path>                      Set runtime directory
  -D                             Enter daemon mode (no input)
  -g <memory-growth>[km]         Set heap growth (default 256k)
  -h                             Display this message and exit
  -l <path>                      Set library configuration file
  -m <memory-space>[km]          Set initial heap size (default 2m)
  -r                             Call Main.run on startup
  -s                             Call Main.stop on shutdown
  -u <network-port-number>       Set UDP listening port (default 57120)
  -i <ide-name>                  Specify IDE name (for enabling IDE-specific class code, default "none")
  -a                             Standalone mode
```
</p></div><div class="class-member"><h4 id="boot"><span class="token function">boot</span>(): <span class="type reference">Promise&lt;<span class="type reference">SclangCompileResult</span>&gt;</span></h4><p class="short-text">Start sclang executable as a subprocess.</p><p class="">sclang will compile it's class library, and this may result in syntax
or compile errors. These errors are parsed and returned in a structured format.

Resolves with:

```js
{dirs: [compiled directories]}
```

or rejects with:

```js
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
</p></div><div class="class-member"><h4 id="compilePaths"><span class="token function">compilePaths</span>(): <span class="type ">[object Object]</span>[]</h4></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="executeFile"><span class="token function">executeFile</span>(<span class="nowrap">filename: <span class="type token entity">string</span></span>): <span class="type reference">Promise&lt;<span class="type token entity">any</span>&gt;</span></h4><p class="short-text">executeFile</p></div><div class="class-member"></div><div class="class-member"><h4 id="installListeners"><span class="token function">installListeners</span>(<span class="nowrap">subprocess: <span class="type reference">ChildProcess</span></span>, <span class="nowrap">listenToStdin: <span class="type token entity">boolean</span> = false</span>): <span class="type token entity">void</span></h4><p class="short-text">listen to events from process and pipe stdio to the stateWatcher</p></div><div class="class-member"><h4 id="interpret"><span class="token function">interpret</span>(<span class="nowrap">code: <span class="type token entity">string</span></span>, <span class="nowrap">nowExecutingPath: <span class="type "><span class="type token entity">undefined</span> | <span class="type token entity">string</span></span></span>, <span class="nowrap">asString: <span class="type token entity">boolean</span> = false</span>, <span class="nowrap">postErrors: <span class="type token entity">boolean</span> = true</span>, <span class="nowrap">getBacktrace: <span class="type token entity">boolean</span> = true</span>): <span class="type reference">Promise&lt;<span class="type reference">SclangResultType</span>&gt;</span></h4><p class="short-text">Interprets code in sclang and returns a Promise.</p><div class="">Returns results - which resolves with result as JSON or rejects with SCLangError.</div></div><div class="class-member"><h4 id="isReady"><span class="token function">isReady</span>(): <span class="type token entity">boolean</span></h4></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="makeSclangConfig"><span class="token function">makeSclangConfig</span>(<span class="nowrap">conf: <span class="type reference">SCLangConf</span></span>): <span class="type reference">Promise&lt;<span class="type token entity">string</span>&gt;</span></h4><p class="short-text">makeSclangConfig</p><p class="">make sclang_config.yaml as a temporary file
with the supplied values

This is the config file that sclang reads, specifying
includePaths and excludePaths

Resolves with path of written config file.
</p></div><div class="class-member"><h4 id="makeStateWatcher"><span class="token function">makeStateWatcher</span>(): <span class="type reference">SclangIO</span></h4></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="quit"><span class="token function">quit</span>(): <span class="type reference">Promise&lt;<span class="type reference">SCLang</span>&gt;</span></h4></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="sclangConfigOptions"><span class="token function">sclangConfigOptions</span>(<span class="nowrap">options: <span class="type reference">SCLangOptions</span></span>): <span class="type reference">SCLangConf</span></h4><p class="short-text">sclangConfigOptions</p><p class="">Builds the options that will be written to the conf file that is read by sclang
If supercolliderjs-conf specifies a sclang_conf path
then this is read and any includePaths and excludePaths are merged

throws error if conf cannot be read
</p></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="spawnProcess"><span class="token function">spawnProcess</span>(<span class="nowrap">execPath: <span class="type token entity">string</span></span>, <span class="nowrap">commandLineOptions: <span class="type token entity">object</span></span>): <span class="type reference">Promise&lt;<span class="type reference">SclangCompileResult</span>&gt;</span></h4><p class="short-text">spawnProcess - starts the sclang executable</p><p class="">sets this.process
adds state listeners
</p><div class="">Returns resolves null on successful boot and compile
    rejects on failure to boot or failure to compile the class library</div></div><div class="class-member"><h4 id="storeSclangConf"><span class="token function">storeSclangConf</span>(): <span class="type reference">Promise&lt;<span class="type reference">SCLang</span>&gt;</span></h4><p class="short-text">storeSclangConf</p><p class="">Store the original configuration path
so that it can be accessed by the modified Quarks methods
to store into the correct conf file.
</p></div><div class="class-member"><h4 id="write"><span class="token function">write</span>(<span class="nowrap">chunk: <span class="type token entity">string</span></span>, <span class="nowrap">noEcho: <span class="type token entity">boolean</span></span>): <span class="type token entity">void</span></h4><p class="short-text">write</p><p class="">Send a raw string to sclang to be interpreted
callback is called after write is complete.
</p></div><div class="class-member"></div></div></div>
