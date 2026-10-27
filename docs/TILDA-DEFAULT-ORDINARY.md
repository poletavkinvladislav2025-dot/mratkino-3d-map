# Ordinary map first

The full T123 loader now defaults to ordinary Yandex + Places. The 3D iframe is loaded only after choosing 3D. Explicit `data-default-mode="3d"` remains supported, so replace that attribute in previously installed snippets with `data-default-mode="yandex"`.

Use `docs/snippets/tilda-map-complete.html` to replace the entire switcher T123 below the old Yandex block, then publish Tilda. All three filters (places, stamps, passport sellers) remain available in either engine.

The 3D source-credit strip starts collapsed behind MapLibre's native information button. Its source links remain accessible on click; route cards and track geometry are unchanged. Collapse applies once per map creation, so later source updates and viewport resizing do not override the user's information toggle.
