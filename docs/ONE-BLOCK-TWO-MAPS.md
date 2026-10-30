# One T123 for both maps

Install `docs/snippets/tilda-map-complete.html` in one T123. It creates the ordinary Yandex map, the lazy 3D iframe and the shared controls. Replace the old ordinary map/switcher code rather than appending another copy. Existing legacy `.vb-t1` maps are still automatically retired in isolation. General pages show the shared intro; configured route pages omit that generic intro.

The same script accepts:

- `data-default-mode="yandex"` (default) or `"3d"`.
- `data-place="yalangas"`, `"zavyaliha"`, `"sunny-valley"`, or another canonical place ID.
- `data-route="yalangas/a1"` or another ID from `integration/route-catalog.json`.
- `data-view="places"`, `"stamps"` or `"passport"` (default places).
- Optional `data-yandex-api-key` for an owner-configured provider key.

`docs/snippets/tilda-map-yalangas.html` is the same widget focused on approach A1. Choose A2 in its route selector or set `data-route="yalangas/a2"`. No second below-map script or extra map copy is needed.

The place picker includes both ГЛЦ Завьялиха and ГЛЦ Солнечная долина. These existing resorts are retained under the same IDs and coordinates, now explicitly named as GLCs. Ordinary place selection fits their complete mapped bounds. Their existing mapped piste/lift geometry appears in either engine and individual sections remain selectable. Current source counts are 7 ski sections/3 lifts/1 training section for Zavyaliha and 20 ski sections/10 lifts/2 training sections for Sunny Valley; these are OSM objects, not official counts of independently operated pistes.

Data flow: `PLACES` generates the shared 52-object place catalog. `prepare-route-catalog.mjs` generates 170 selectable route records from the existing walking files, long-distance registry, resort piste classification and winter catalog files. It does not invent paths or change owner coordinates. Hiking colors are shared with the 3D style. Original route geometry and display-only lane files are reused by both renderers.

Ordinary route lines use Yandex's own renderer, converting pixel offsets through its Mercator projection to preserve parallel route display. Only near-viewport sections are created; geometry is cached and route lane coordinates are recomputed on zoom, not on every pan frame. Low-zoom full-Ural views use unsplit GPX geometry to bound SDK object counts. Source route files remain unchanged. Native 3D geometry and the permanent `/preview/unified/` URL remain the same.

The shared controller preserves filter, place and route ID when changing engines. 3D gets only origin-bound v1 messages; its openRoute API now also supports long-distance trails and the two main resorts' lift IDs. The ordinary adapter remains v1 and adds route methods/state without breaking existing place/filter callers. Stamps/passport views hide route overlays in both engines. The 3D iframe still loads only when requested.

The shared place picker makes distant resorts accessible without changing the owner's local Beloretsk–Abzakovo welcome view. Route selection also displays its parent place in this picker. Asynchronous ordinary route requests are invalidated by newer route/filter choices so a late route response cannot restore an obsolete selection.

Validation: unit checks and production build passed. Browser checks passed for the real Yandex SDK drawing routes, the same route in real 3D, a standalone single-T123 Yalangas setup, both named resorts' ski selections in both engines, stamp/passport filtering, mobile route-card bounds, rapid filter cancellation and responsive outer gutters. Provider tiles were real in the 3D tests; the broad state test used a fake ordinary SDK and the separate SDK test used live Yandex. Physical mobile browsers were not tested. The live Tilda editor was not modified.
