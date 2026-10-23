import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {localFrame,distanceToLine,decodeForestInstances,forestLOD} from '../src/resort-scene-data.js';
import {localRiderAreas,buildRiderCorridor,riderState,riderProfile,insideRiderArea} from '../src/rider-motion.js';
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
test('estimated Abzakovo clearings spread skiers across lanes and give snowboarders curved paths',()=>{
 const frame=localFrame(manifest.center),areas=localRiderAreas(read('piste-areas.geojson').features,frame.toLocal);
 assert.equal(areas.length,19);let safe=0,total=0,minimum=0,maximum=0,lean=0;
 for(const [ri,f] of trails.features.entries()){
  const own=areas.filter(a=>a.trailId===f.properties.id),limit=Math.min(...own.map(a=>a.maxHalfWidthM));
  assert.ok(limit>=12&&limit<=80);
  const corridor=buildRiderCorridor(f.geometry.coordinates.map(frame.toLocal),own,{maxHalfWidth:limit});
  for(let i=0;i<18;i++)for(let d=15;d<corridor.length-15;d+=31){
   const s=riderState(corridor,riderProfile(ri,i,f.properties.name),d);total++;
   if(!s.inside)continue;safe++;assert.ok(insideRiderArea(s.point,own));assert.ok(Math.abs(s.offset)<=limit+.01);
   minimum=Math.min(minimum,s.offset);maximum=Math.max(maximum,s.offset);lean=Math.max(lean,Math.abs(s.lean));
  }
 }
 assert.ok(safe/total>.75);assert.ok(maximum-minimum>60);assert.ok(lean>.03);
});
test('Abzakovo pine binary has its own origin, real elevations and viewport-bounded LOD',()=>{
 const bytes=fs.readFileSync('public/region/abzakovo/forest-instances.bin'),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 assert.throws(()=>decodeForestInstances(buffer),/origin/);
 const pool=decodeForestInstances(buffer,manifest.center),frame=localFrame(manifest.center);assert.ok(pool.count>40000);assert.equal(pool.count,manifest.forestCount);
 for(let i=0;i<pool.count;i+=29){const [x,y,z]=pool.positions.subarray(i*3,i*3+3);assert.ok(distanceKm(frame.toLngLat([x,y]),manifest.center)<2.01);assert.ok(z>300&&z<1100);}
 const point=pool.positions.subarray(2000*3,2000*3+2),center=frame.toLngLat(point),bounds=[frame.toLngLat([point[0]-100,point[1]-100]),frame.toLngLat([point[0]+100,point[1]+100])];
 const lod=forestLOD(pool,center,{zoom:18,bounds,project:frame.toLocal});assert.ok(lod.near.includes(2000));assert.ok(lod.near.length<1800);assert.ok(lod.far.length<500);
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
