# Ordinary map first

The full T123 loader now defaults to ordinary Yandex + Places. The 3D iframe is loaded only after choosing 3D. Explicit `data-default-mode="3d"` remains supported, so replace that attribute in previously installed snippets with `data-default-mode="yandex"`.

Use `docs/snippets/tilda-map-complete.html` to replace the entire switcher T123 below the old Yandex block, then publish Tilda. All three filters (places, stamps, passport sellers) remain available in either engine.

The 3D source-credit strip starts collapsed behind MapLibre's native information button. Its source links remain accessible on click; route cards and track geometry are unchanged. Collapse applies once per map creation, so later source updates and viewport resizing do not override the user's information toggle.

Validation: unit checks and production build passed. Focused browser checks passed for legacy Tilda migration, all three 3D filters, opening/closing attribution, and five responsive widths (320–1920 px) with default ordinary/places and an unloaded 3D iframe.

Published source: `553338f40bf6d933f5e0928174690b721effc4b1`; successful workflow `40553799323`. Post-publication verification: 112 files, 80 previous files unchanged (`ordinary-pages-verification.json`). The live Tilda editor was not changed; the owner must replace its T123 snippet and publish Tilda.
