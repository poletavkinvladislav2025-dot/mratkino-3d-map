# Southern Ural Trail description

Checked 2026-10-31 against the project's official pages:

- https://suraltrail.ru/ calls the project a thousand-kilometre walking trail.
- https://suraltrail.ru/about states a combined length of more than 950 km for all trails.
- https://suraltrail.ru/faq distinguishes the 500 km main branch from additional branches and segments.

Both map engines now share the updated description in `src/region/map-content.json`: the network exceeds 950 km; the main branch is about 500 km, from Bannoye to Lake Turgoyak via Abzakovo, Beloretsk, Inzerskie Zubchatki, Iremel, Zigalga, Zyuratkul and Taganay. The existing official website link is retained.

The supplied YT_v2-8.gpx remains unchanged at 489.327 km. Its distance is labelled “Загруженный трек” in the ordinary route card and 3D layer controls, so it is not presented as the length of the entire network. No additional branches are fabricated or claimed to be included in the uploaded track.

Validation: all 20 unit modules and production build passed. A temporary focused browser check verified both descriptions, the official link, and the track-specific distance in ordinary and real 3D mode (5.5 seconds including server startup); the temporary check was removed afterwards. Published source `33737750ea862a86584e14ed5ab3d9bc604612e2`, successful workflow `41226864608`. Verified 14 published files against the build, including the exact Tilda switcher URL, index, shared route catalog and all current assets; confirmed both previous asset generations are retained. Tilda code and the permanent map URL remain unchanged.
