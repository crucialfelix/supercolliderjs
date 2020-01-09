# whenNodeGo
Package: <a href="#/packages/server/api">@supercollider/server</a>

<div class="entity-box"><h4 id="whenNodeGo"><span class="token function">whenNodeGo</span>(<span class="nowrap">server: <span class="type reference">Server</span></span>, <span class="nowrap">id: <span class="type token entity">string</span></span>, <span class="nowrap">nodeID: <span class="type token entity">number</span></span>): <span class="type reference">Promise&lt;<span class="type token entity">number</span>&gt;</span></h4><p class="short-text">Returns a Promise that resolves when the server sends an
`/n_go` message.</p><p class="">The id is usually a context id (dryadic) but could be any random guid.
It can be anything you want to supply as long as it is unique.
</p><div class="">Returns - resolves with nodeID</div></div>
