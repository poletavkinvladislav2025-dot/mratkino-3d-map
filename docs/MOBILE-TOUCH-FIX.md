# Mobile route popup and touch navigation

The reported mobile screenshot showed a long-route geographic popup clipped at the left map edge. At widths up to 760 px, route details now dock inside the map with 12 px side/bottom insets, wrapping text and a scrollable content area. The close target is at least 44 × 44 px. Desktop geographic anchors remain unchanged.

Removed the coarse-pointer cooperative gesture requirement: the 3D map can be dragged with one finger, while two-finger pinch zoom remains available. The surrounding Tilda page still scrolls outside the map. No new map URL or T123 snippet is required.

Validation: unit checks and production build passed. Focused tests against real provider tiles passed: route click/description/link behavior on desktop and 390 px mobile, popup bounds/close target, and CDP single-touch pan plus two-touch pinch in an actual embedded 3D map. These are Chromium device-emulation checks, not a physical Samsung/Safari test.

Published source `1ef8622d955a9dd39036489e073f999b8ffb6384`, successful workflow `40693000819`. Post-publication verification: 112 files, 80 previous files unchanged (`mobile-touch-pages-verification.json`). The Tilda editor was not modified; existing iframe/loader URLs continue to work.
