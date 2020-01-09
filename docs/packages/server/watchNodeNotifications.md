# watchNodeNotifications
Package: <a href="#/packages/server/api">@supercollider/server</a>

<div class="entity-box"><h4 id="watchNodeNotifications"><span class="token function">watchNodeNotifications</span>(<span class="nowrap">server: <span class="type reference">Server</span></span>): <span class="type reference">Disposable</span></h4><p class="short-text">Watch server OSC receive for any n_XXX messages:</p><p class="">- `n_go`
- `n_end`
- `n_on`
- `n_off`
- `n_move`
- `n_info`

Save all of the supplied info for the node
and call any registered callbacks.

Initially there is no need to unwatch unless you are
creating and discarding Server objects which can happen
during testing.

TODO: add Server.destroy
</p><div class="">Returns - sub.dispose(); to turn it off.</div></div>
