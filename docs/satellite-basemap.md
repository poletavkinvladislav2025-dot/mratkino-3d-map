# Satellite basemap for both existing maps

Status: implemented, disabled until the owner configures a licensed imagery account. No satellite provider key is bundled. The existing schematic map remains the default; without a valid configuration, the unavailable switch is hidden.

## Activate MapTiler

1. Create an account at https://www.maptiler.com/cloud/ and choose a plan whose terms allow this public tourism website and its expected traffic. Review current pricing in the account; no fixed price or free commercial allowance is assumed here.
2. Create a **public browser key** restricted to the actual hosts: `visitbeloretsk.ru`, any used `www` hostname, and `poletavkinvladislav2025-dot.github.io`. Use the provider's allowed-origin/HTTP-referrer settings for each host, including iframe requests originating from GitHub Pages.
3. Edit `public/integration/imagery.json`: retain `schemaVersion: 1`, `provider: "maptiler"`; set `enabled: true` and `publicKey` to this restricted browser key. This file is public by design. Never put account passwords or secret server tokens here.
4. Run the build and checks, then publish the existing unified release. No replacement Tilda block, map URL or route IDs are needed.
5. Verify real imagery at Mраткино, Малиновая and Айгир, including close zoom, licensing attribution, terrain alignment, desktop/mobile controls and both modes. Imagery date/resolution and terrain resolution are separate; adding photography does not improve the DEM. This geographical quality check is pending the owner's key.

The raster endpoint uses MapTiler Satellite v2 TileJSON; provider attribution is taken from TileJSON and the official MapTiler logo is shown while imagery is visible. Base OSM/DEM attribution remains intact. Do not substitute another provider without reviewing its documented API and use terms.

## Behavior

A single configuration and controller drive both ordinary MapLibre and 3D MapLibre maps. `basemap=satellite` is optional in the existing URL; `setBasemap` is a strict bridge command with `scheme`/`satellite`. The choice follows mode changes without replacing the map or modifying coordinates, GPX, route IDs, cards, camera or terrain. Schematic ground decoration and illustrated forest are suppressed over photography; route lines, labels, lift/visitor models and landmark models stay available. Imagery loads lazily. Provider errors restore the scheme and show a short message.

The ordinary adapter exposes `getBasemap()` and async `setBasemap(mode)`. Native URLs and the shared parent toolbar retain the choice. With no key, `basemap=satellite` safely returns to scheme.

## Checks

`tests/imagery.test.js` checks configuration, lazy loading, overlay preservation, visibility restoration and source errors. `tests/satellite.spec.js` intercepts all imagery requests locally with a **labelled diagnostic tile** and a local test credential, never forwarded to MapTiler. It tests integration, route/camera/terrain preservation, mode synchronization, mobile sizing and missing-key behavior. Diagnostic imagery is not evidence of real provider coverage or visual quality.

Official background: https://www.maptiler.com/satellite/ . Esri's publicly reachable World Imagery endpoint was not adopted: public reachability does not establish permission for this website's commercial use.
