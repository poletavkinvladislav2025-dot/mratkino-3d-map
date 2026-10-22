import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {boundsFor,slopeCamera,createStyle} from '../src/map-data.js';
const trails=JSON.parse(fs.readFileSync('public/live/trails.geojson'));const manifest=JSON.parse(fs.readFileSync('public/live/manifest.json'));
test('cameras derive opposite directions from actual mapped slopes',()=>{
 const a=slopeCamera(trails.features,'south'),b=slopeCamera(trails.features,'north');assert.ok(a.bounds&&b.bounds);assert.ok(a.base[1]<manifest.center[1]);assert.ok(b.base[1]>manifest.center[1]);assert.ok(Math.abs(((a.bearing-b.bearing+540)%360)-180)>100);
 assert.equal(slopeCamera([],'south'),null);assert.equal(boundsFor([]),null);
});
test('terrain is 1:1 and unverified OSM difficulty never supplies a verified category',()=>{
 const style=createStyle({manifest,trails},'local://{z}/{x}/{y}');assert.equal(style.terrain.exaggeration,1);assert.equal(style.sources.dem.encoding,'terrarium');assert.ok(trails.features.every(f=>f.properties.difficulty_verified===false));
 assert.deepEqual(manifest.missing_trails,['Ю5']);const conflict=trails.features.find(f=>f.properties.name==='Ю3');assert.equal(conflict.properties.ref,'Ю2');assert.equal(conflict.properties.warnings.length,1);
});
