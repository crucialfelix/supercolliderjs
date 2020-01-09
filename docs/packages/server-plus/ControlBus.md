# ControlBus
Package: <a href="#/packages/server-plus/api">@supercollider/server-plus</a>

<div class="entity-box"><div class="Class"><h3 class="class-header" id="ControlBus"><span class="token keyword">class</span> <span class="class">ControlBus</span></h3><span class="token keyword">extends</span> <span class="type reference">AudioBus</span><p class="short-text">scsynth control bus</p><p class="">See `server.controlBus(...)`

These bus numbers (ids) and numChannels are allocated here in the client.
The server only gets bus ids for reading and writing to.
</p><div class="section-heading">Constructor</div><div class="class-member"></div><div class="section-heading">Property</div><div class="class-member"><h4 id="id"><span class="token property">id</span> <span class="type token entity">number</span></h4></div><div class="class-member"><h4 id="numChannels"><span class="token property">numChannels</span> <span class="type token entity">number</span></h4></div><div class="class-member"><h4 id="server"><span class="token property">server</span> <span class="type reference">ServerPlus</span></h4></div><div class="section-heading">Method</div><div class="class-member"><h4 id="free"><span class="token function">free</span>(): <span class="type token entity">void</span></h4><p class="short-text">Deallocate the ControlBus, freeing it for resuse.</p></div></div></div>
