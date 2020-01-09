# Server
Package: <a href="#/packages/server/api">@supercollider/server</a>

<div class="entity-box"><div class="Class"><h3 class="class-header" id="Server"><span class="token keyword">class</span> <span class="class">Server</span></h3><span class="token keyword">extends</span> <span class="type reference">EventEmitter</span><p class="short-text">Server - starts a SuperCollider synthesis server (scsynth)
as a child process. Enables OSC communication, subscribe to process events,
send call and response OSC messages.</p><p class="">SuperCollider comes with an executable called scsynth
which can be communicated with via OSC.

To send raw OSC messages:
```js
server.send.msg('/s_new', ['defName', 440])
```

Raw OSC responses can be subscribed to:
```js
server.receive.subscribe(function(msg) {
  console.log(msg);
});
```
</p><div class="section-heading">Constructor</div><div class="class-member"><h4 id="constructor"><span class="token function">new Server</span>(<span class="nowrap">options: <span class="type reference">ServerArgs</span> =  {}</span>, <span class="nowrap">stateStore: <span class="type reference">Store</span></span>): <span class="type reference">Server</span></h4></div><div class="section-heading">Property</div><div class="class-member"></div><div class="class-member"><h4 id="address"><span class="token property">address</span> <span class="type token entity">string</span></h4></div><div class="class-member"><h4 id="isRunning"><span class="token property">isRunning</span> <span class="type token entity">boolean</span></h4></div><div class="class-member"><h4 id="log"><span class="token property">log</span> <span class="type reference">Logger</span></h4>
<p class="short-text">The logger used to print messages to the console.</p></div><div class="class-member"><h4 id="options"><span class="token property">options</span> <span class="type reference">ServerOptions</span></h4></div><div class="class-member"></div><div class="class-member"><h4 id="process"><span class="token property">process</span> <span class="type token entity">any</span></h4>
<p class="short-text">The process id that nodejs spawn() returns</p></div><div class="class-member"><h4 id="processEvents"><span class="token property">processEvents</span> <span class="type reference">Subject&lt;<span class="type "><span class="type token entity">string</span> | <span class="type reference">Error</span></span>&gt;</span></h4>
<p class="short-text">A subscribeable stream of events related to the scsynth process.
Used internally.</p></div><div class="class-member"><h4 id="receive"><span class="token property">receive</span> <span class="type reference">Subject&lt;<span class="type reference">MsgType</span>&gt;</span></h4>
<p class="short-text">A subscribeable stream of OSC events received.</p></div><div class="class-member"><h4 id="send"><span class="token property">send</span> <span class="type reference">SendOSC</span></h4>
<p class="short-text">Supports `server.send.msg()` and `server.send.bundle()`</p><p class="">You can also subscribe to it and get the OSC messages
and bundles that are being sent echoed to you for
debugging purposes.
</p></div><div class="class-member"><h4 id="state"><span class="token property">state</span> <span class="type reference">ServerState</span></h4>
<p class="short-text">Holds the mutable server state
including allocators and the node state watcher.
If a parent stateStore is supplied then it will store within that.</p></div><div class="class-member"><h4 id="stdout"><span class="token property">stdout</span> <span class="type reference">Subject&lt;<span class="type token entity">string</span>&gt;</span></h4>
<p class="short-text">A subscribeable stream of STDOUT printed by the scsynth process.</p></div><div class="class-member"><h4 id="defaultMaxListeners"><span class="token property">defaultMaxListeners</span> <span class="type token entity">number</span></h4></div><div class="section-heading">Method</div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="_spawnProcess"><span class="token function">_spawnProcess</span>(): <span class="type token entity">void</span></h4></div><div class="class-member"></div><div class="class-member"><h4 id="args"><span class="token function">args</span>(): <span class="type ">[object Object]</span>[]</h4><p class="short-text">Format the command line args for scsynth.</p><p class="">The args built using the options supplied to `Server(options)` or `sc.server.boot(options)`

```js
 sc.server.boot({device: 'Soundflower (2ch)'});
 sc.server.boot({serverPort: '11211'});
 ```

Supported arguments:

    numAudioBusChannels
    numControlBusChannels
    numInputBusChannels
    numOutputBusChannels
    numBuffers
    maxNodes
    maxSynthDefs
    blockSize
    hardwareBufferSize
    memSize
    numRGens - max random generators
    numWireBufs
    sampleRate
    loadDefs - (0 or 1)
    inputStreamsEnabled - "01100" means only the 2nd and 3rd input streams
                         on the device will be enabled
    outputStreamsEnabled,
    device - name of hardware device
           or array of names for [inputDevice, outputDevice]
    verbosity: 0 1 2
    restrictedPath
    ugenPluginsPath
    password - for TCP logins open to the internet
    maxLogins - max users that may login

Arbitrary arguments can be passed in as options.commandLineArgs
which is an array of strings that will be space-concatenated
and correctly shell-escaped.

Host is currently ignored: it is always local on the same machine.

See ServerOptions documentation: http://danielnouri.org/docs/SuperColliderHelp/ServerArchitecture/ServerOptions.html
</p><div class="">Returns List of non-default args</div></div><div class="class-member"><h4 id="boot"><span class="token function">boot</span>(): <span class="type reference">Promise&lt;<span class="type reference">Server</span>&gt;</span></h4><p class="short-text">Boot the server</p><p class="">Start scsynth and establish a pipe connection to receive stdout and stderr.

Does not connect, so UDP is not yet ready for OSC communication.

listen for system events and emit: exit out error
</p></div><div class="class-member"><h4 id="callAndResponse"><span class="token function">callAndResponse</span>(<span class="nowrap">callAndResponse: <span class="type reference">CallAndResponse</span></span>, <span class="nowrap">timeout: <span class="type token entity">number</span> = 4000</span>): <span class="type reference">Promise&lt;<span class="type reference">MsgType</span>&gt;</span></h4><p class="short-text">Send an OSC command that expects a reply from the server,
returning a `Promise` that resolves with the response.</p><p class="">This is for getting responses async from the server.
The first part of the message matches the expected args,
and the rest of the message contains the response.

 ```js
 {
     call: ['/some_osc_msg', 1, 2],
     response: ['/expected_osc_response', 1, 2, 3]
 }
  ```</p><div class="">Returns - resolves with all values the server responsed with after the matched response.</div></div><div class="class-member"><h4 id="connect"><span class="token function">connect</span>(): <span class="type reference">Promise&lt;<span class="type reference">Server</span>&gt;</span></h4><p class="short-text">Establish connection to scsynth via OSC socket</p><div class="">Returns - resolves when udp responds</div></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="oscOnce"><span class="token function">oscOnce</span>(<span class="nowrap">matchArgs: <span class="type reference">MsgType</span></span>, <span class="nowrap">timeout: <span class="type token entity">number</span> = 4000</span>): <span class="type reference">Promise&lt;<span class="type reference">MsgType</span>&gt;</span></h4><p class="short-text">Wait for a single OSC response from server matching the supplied args.</p><p class="">This is for getting responses async from the server.
The first part of the message matches the expected args,
and the rest of the message contains the response.

The Promise fullfills with any remaining payload including in the message.
</p></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="quit"><span class="token function">quit</span>(): <span class="type token entity">void</span></h4><p class="short-text">quit</p><p class="">kill scsynth process
TODO: should send /quit first for shutting files
</p></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"></div><div class="class-member"><h4 id="sendMsg"><span class="token function">sendMsg</span>(<span class="nowrap">address: <span class="type token entity">string</span></span>, <span class="nowrap">args: <span class="type ">[object Object]</span>[]</span>): <span class="type token entity">void</span></h4><p class="short-text">Send OSC message to server</p></div><div class="class-member"></div><div class="class-member"></div></div></div>
