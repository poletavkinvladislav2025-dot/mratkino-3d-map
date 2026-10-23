import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {localFrame,distanceToLine} from '../src/resort-scene-data.js';
import {buildRiderCorridor,riderState,riderProfile} from '../src/rider-motion.js';
import {presetFor,byId,distanceKm} from '../src/region/presets.js';
const read=name=>JSON.parse(fs.readFileSync('public/region/abzakovo/'+name));
const manifest=read('manifest.json'),trails=read('trails.geojson'),lifts=read('lifts.geojson'),audit=read('source-audit.json');
test('Abzakovo has 12 official numbers on 19 original mapped segments and eight correctly typed lifts',()=>{
 assert.deepEqual(manifest.trailNumbers,['1','2','3','4','5','7','8','9','10','11','12','13']);assert.equal(trails.features.length,19);assert.equal(lifts.features.length,8);
 const chair=lifts.features.filter(f=>f.properties.tags.aerialway==='chair_lift');assert.deepEqual(chair.map(f=>f.properties.seats).sort(),[2,4]);assert.equal(lifts.features.filter(f=>f.properties.tags.aerialway==='platter').length,6);
 assert.equal(lifts.features.find(f=>f.properties.number==='5').properties.animate,true);assert.equal(lifts.features.filter(f=>f.properties.numberStatus==='pair-order-unconfirmed').length,2);
 for(const f of [...trails.features,...lifts.features]){const source=audit.objects.find(o=>o.id===f.properties.id);assert.ok(source);if(!source.clippedAtRadius)assert.deepEqual(f.geometry.coordinates,source.originalCoordinates);assert.equal(f.properties.geometryVerifiedByResort,false);}
 assert.ok(trails.features.every(f=>f.properties.widthStatus==='not-mapped'&&f.geometry.type==='LineString'));
});
test('Abzakovo has a separate 2 km centre and no old Mratkino coordinate origin or invented piste width',()=>{
 assert.deepEqual(byId('abzakovo').coordinates,manifest.center);assert.equal(byId('abzakovo').zoneRadiusKm,2);assert.deepEqual(presetFor('abzakovo').data,['abzakovo']);
 const frame=localFrame(manifest.center);assert.ok(Math.hypot(...frame.toLocal(manifest.center))<1e-8);
 for(const f of trails.features){
  const line=f.geometry.coordinates.map(frame.toLocal),corridor=buildRiderCorridor(line,[],{centerlineOnly:true}),profile=riderProfile(0,0,f.properties.name);
  for(let d=0;d<corridor.length;d+=7){const state=riderState(corridor,profile,d),ll=frame.toLngLat(state.point);assert.ok(state.inside);assert.equal(state.offset,0);assert.ok(distanceToLine(state.point,line)<1e-7);assert.ok(distanceKm(ll,manifest.center)<2.01);}
 }
 assert.equal(riderState(buildRiderCorridor([[0,0],[0,100]],[]),{speed:5,wavelength:40,amplitude:20,phase:0},50).inside,false);
});
