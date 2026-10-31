# One search, contextual routes

The existing permanent map and hosted T123 loader remain in use. No replacement map URL or additional Tilda block is needed.

- The two independent place/route selects are replaced by one search. Results distinguish places from routes and show the route's parent place.
- Picking a place opens its card. Ordinary cards group routes by the shared catalog's exact canonical `placeId`: hiking, skiing, lifts, nordic, tubing and training. Empty groups are omitted. A route cannot appear in an unrelated place's card.
- The 3D engine keeps its existing place-specific cards. Only its duplicate search button is hidden when `embed=1&externalSearch=1`; standalone maps keep their search.
- Searching a route explicitly changes to that route and its parent. Switching rendering engines preserves the selected route/category.
- Long-distance trails have a separate “Тропы” menu and searchable entries; they do not appear inside unrelated local cards. Their original lines, source links and attribution are retained.
- Search supports keyboard arrows, Enter and Escape. Empty searches offer places and long-distance trails; stamp/passport filters search only eligible stations.
- A compact context button returns to the overview. Ordinary route cards offer a return to their parent place.
- On phones the search takes a full row. The ordinary bottom card shows a short preview and expands with its toggle or an upward swipe on the header. Cards and search results scroll internally.

Validation: production build, unit suite, focused shared-map behavior tests at 390/768/1365 px, real Yandex SDK + real 3D integration test. Browser checks use the existing real tile relay. Physical phones are not available in this environment.

Published source: `f0275cd0be8de6872dfd3ce84e9fc631fdc72642`; successful existing workflow run `41225998779`. All 20 unit modules and the production build passed. Real SDK integration passed; the final responsive/state/3D grip browser check passed in 47.5 seconds. Verified 183 published files, with 174 previous files unchanged (`search-pages-verification.json`). Exact existing `tilda-map-block.js?v=20261029-common` and switcher URLs return 200, match the built files, and allow CORS from Visit Beloretsk. An initial post-deployment index response was still cached; after propagation the complete verification passed. No live Tilda editor was changed; its public page returned HTTP 403 to the read-only checker, so its installed snippet could not be independently rechecked.
