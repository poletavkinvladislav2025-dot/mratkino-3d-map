import test from 'node:test';import assert from 'node:assert/strict';
import {PLACES,presetFor,activeZones} from '../src/region/presets.js';
import {normalizeRoutes,routeMetrics,routeEndpoints} from '../src/region/routes.js';
import {createRegionalStyle} from '../src/region/style.js';
import {readFileSync} from 'node:fs';
test('22 distinct locations, every preset, city overhead, and bounded lazy zones',()=>{
 assert.equal(PLACES.length,22);assert.equal(new Set(PLACES.map(p=>p.id)).size,22);
 for(const p of PLACES){const preset=presetFor(p.id);assert.equal(preset.id,p.id);assert.ok(preset.center[0]>57&&preset.center[0]<60);assert.ok(preset.center[1]>53&&preset.center[1]<55);assert.ok(preset.zoom>10);}
 assert.equal(presetFor('beloretsk').pitch,4);assert.equal(presetFor('unknown').id,'mratkino');
 assert.equal(activeZones([58.43,54],9).length,0);assert.ok(activeZones([58.43,54],14).some(p=>p.id==='mratkino'));assert.equal(activeZones([0,0],15).length,0);
 assert.equal(PLACES.find(p=>p.id==='maly-yamantau').elevation,974);assert.ok(PLACES.find(p=>p.id==='yamantau').access);assert.equal(PLACES.find(p=>p.id==='kraka').coordinateStatus,'project-reference');
});
test('regional style hides only disputed freeride, preserves named trails and avoids city POIs',()=>{
 const manifest=JSON.parse(readFileSync('public/live/manifest.json'));const style=createRegionalStyle({manifest},null);
 assert.equal(style.terrain.exaggeration,1);assert.equal(style.sources.dem.maxzoom,12);assert.equal(style.sources.dem.tileSize,512);
 assert.ok(!style.layers.some(l=>l.type==='symbol'||l.type==='fill-extrusion'));assert.ok(style.layers.some(l=>l.id==='region-roads'));
 assert.ok(JSON.stringify(style.layers.find(l=>l.id==='trail-line').filter).includes('way/933862767'));
 const trails=JSON.parse(readFileSync('public/live/trails.geojson'));assert.ok(trails.features.some(f=>f.properties.id==='way/933862767'));assert.equal(trails.features.filter(f=>f.geometry.type==='LineString'&&/^[ЮС][1-4]$/.test(f.properties.name)).length,7);
});
test('route metrics do not bridge disconnected track segments or invent elevations/time',()=>{
 const fc=normalizeRoutes({type:'Feature',properties:{name:'test'},geometry:{type:'MultiLineString',coordinates:[[[58,54],[58.01,54]],[[59,55],[59.01,55]]]}});
 const result=routeMetrics(fc);assert.ok(result.lengthKm>1&&result.lengthKm<2);assert.equal(result.gainM,null);assert.equal(result.duration,null);assert.deepEqual(result.start,[58,54]);assert.deepEqual(result.end,[59.01,55]);assert.equal(routeEndpoints(fc).features.length,2);
 const elevated=normalizeRoutes({type:'LineString',coordinates:[[58,54,100],[58.01,54,130],[58.02,54,120]]});assert.equal(routeMetrics(elevated).gainM,30);
 assert.throws(()=>normalizeRoutes({type:'LineString',coordinates:[[54,58],[200,54]]}));assert.throws(()=>normalizeRoutes({type:'LineString',coordinates:[[58,54],[58,54,'bad']]}));assert.throws(()=>normalizeRoutes({type:'Polygon',coordinates:[]}));
});
