// Stable entry for the ordinary map on Tilda pages: the same MapLibre build as the 3D map,
// published at integration/osm-maplibre.js on the map's own server.
import * as ml from 'maplibre-gl';
import css from 'maplibre-gl/dist/maplibre-gl.css?inline';
import worker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
const workerURL=new URL(worker,import.meta.url).href;
globalThis.__vbMapLibre={ml,css,workerURL};
export {ml,css,workerURL};
