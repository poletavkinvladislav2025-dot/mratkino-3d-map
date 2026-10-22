# Regional reference audit — 2026-10-22

- `osm-peaks.json`: real Overpass `natural=peak` nodes in bbox 53.4,57.1,54.85,59.1, used for name-and-distance matching. ODbL, © OpenStreetMap contributors.
- `reference-check.json`: compact tagged matches from actual OSM API 0.6 map extracts around the remaining natural locations and city. Contains source references, not newly invented features. Full XML extracts stay local and are ignored to avoid distributing unrelated city data.
- `mapterhorn-tilejson.json`, `openfreemap-tilejson.json`: actual source metadata at verification time. The live application reads the current OpenFreeMap TileJSON, not a hard-coded dated planet URL.
- The coordinate registry and user-facing accuracy notes are in `src/region/places.json` and `public/region/coordinate-audit.json`.

Source pages are retained locally for the licensing audit and are not republished: Mapterhorn attribution, OpenFreeMap quick start/terms, Great Ural Trail homepage, Visit Beloretsk homepage. Public HTML of the Visit Beloretsk homepage did not show a map iframe; this does not establish how other Tilda pages are configured. The Great Ural Trail GPX/KML subpage request did not succeed, and a redistribution licence for its track data was not established. No such tracks are included.

Sources: https://api.openstreetmap.org/api/0.6/map , https://overpass-api.de/api/interpreter , https://tiles.mapterhorn.com/tilejson.json , https://tiles.openfreemap.org/planet , https://mapterhorn.com/attribution , https://openfreemap.org/tos/ , https://greaturaltrail.ru/ .
