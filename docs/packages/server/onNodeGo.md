# onNodeGo
Package: <a href="#/packages/server/api">@supercollider/server</a>

<div class="entity-box"><h4 id="onNodeGo"><span class="token function">onNodeGo</span>(<span class="nowrap">server: <span class="type reference">Server</span></span>, <span class="nowrap">id: <span class="type token entity">string</span></span>, <span class="nowrap">nodeID: <span class="type token entity">number</span></span>, <span class="nowrap">handler: <span class="type reference">Function</span></span>): <span class="type reference">Function</span></h4><p class="short-text">Call a function when the server sends an `/n_go` message
One callback allowed per id and node
The id is usually a context id but could be a random guid</p><div class="">Returns - cancel function</div></div>
