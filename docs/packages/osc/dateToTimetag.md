# dateToTimetag
Package: <a href="#/packages/osc/api">@supercollider/osc</a>

<div class="entity-box"><h4 id="dateToTimetag"><span class="token function">dateToTimetag</span>(<span class="nowrap">date: <span class="type reference">Date</span></span>): <span class="type reference">NTPTimeTag</span></h4><p class="short-text">Convert a JavaScript Date to a NTP timetag array `[secondsSince1970, fractionalSeconds]`.</p><p class="">`toBuffer` already accepts Dates for timetags so you might not need this function.
If you need to schedule bundles with sub-millisecond accuracy then you
could use this to help assemble the NTP array.
</p></div>
