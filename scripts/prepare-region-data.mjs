/** Derive a small resort-only facility payload; keep the complete OSM source untouched. */
import fs from 'node:fs';import crypto from 'node:crypto';
import {resortFacilities} from '../src/region/style.js';
import {PLACES} from '../src/region/presets.js';
import {sourceGeoJSON} from '../src/region/passport.js';
fs.copyFileSync('src/region/piste-catalog.json','public/region/piste-catalog.json');
fs.writeFileSync('public/region/source-map-points.geojson',JSON.stringify(sourceGeoJSON(PLACES),null,2)+'\n');
const source=fs.readFileSync('public/live/facilities.geojson'),trails=JSON.parse(fs.readFileSync('public/live/trails.geojson'));
const data={trails,facilities:JSON.parse(source)},filtered=resortFacilities(data);
fs.mkdirSync('public/region',{recursive:true});fs.writeFileSync('public/region/mratkino-facilities.geojson',JSON.stringify(filtered));
fs.writeFileSync('public/region/mratkino-facilities-provenance.json',JSON.stringify({source:'public/live/facilities.geojson',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),sourceCount:data.facilities.features.length,selectedCount:filtered.features.length,rule:'intersects bounding box of seven named resort pistes, plus approximately 200 m; same source geometries and IDs',license:'ODbL-1.0, © OpenStreetMap contributors'},null,2)+'\n');
console.log(`Resort facilities: ${filtered.features.length}/${data.facilities.features.length} source objects; ${fs.statSync('public/region/mratkino-facilities.geojson').size} bytes`);
