# Distinct map mode and content controls

Renamed the ordinary-map button to «Карта» (including its accessible name). Mode buttons share one rounded muted-green track, with a dark active segment. The three content filters use separate white pills and a pale active fill. Mobile keeps a compact mode switch and the existing content dropdown; all touch targets remain at least 44 px.

The current T123 snippet and ordinary/places default are unchanged. Existing installations receive the new styling from the same hosted loader. Unit checks, production build, desktop/mobile ordinary filter tests and five-width outer-layout checks passed. Yandex is stubbed for these layout tests; map behavior and the 3D application code are unchanged.

Published `bab871a00b96db0b4607d75a964ef767096a0e37` through successful workflow `40556095727`. Verification: 112 published files, 85 previous files unchanged (`controls-pages-verification.json`). Existing T123 snippet needs no edit; refresh the published page to fetch the current loader.
