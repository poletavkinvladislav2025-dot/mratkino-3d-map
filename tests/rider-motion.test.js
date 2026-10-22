import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {ACTIVE_RIDER_TRAILS,ridersPerTrail,riderProfile,localRiderAreas,buildRiderCorridor,riderState,insideRiderArea} from '../src/rider-motion.js';
import {toLocal} from '../src/resort-scene-data.js';
const features=JSON.parse(fs.readFileSync('public/live/trails.geojson')).features;
test('crowd budgets, individual profiles and closed piste exclusion',()=>{
 assert.equal(ridersPerTrail(false)*ACTIVE_RIDER_TRAILS.size,120);assert.equal(ridersPerTrail(true)*ACTIVE_RIDER_TRAILS.size,48);assert.equal(ACTIVE_RIDER_TRAILS.has('С1'),false);
 const profiles=Array.from({length:20},(_,i)=>riderProfile(0,i,'Ю4'));assert.equal(new Set(profiles.map(p=>p.speed)).size,20);assert.ok(profiles.some(p=>p.board)&&profiles.some(p=>!p.board));
});
test('actual pistes support arcs inside mapped polygons, with real lateral travel and both lean directions',()=>{
 const areas=localRiderAreas(features);let carved=0;
 for(const line of features.filter(f=>f.geometry.type==='LineString'&&ACTIVE_RIDER_TRAILS.has(f.properties.name))){
  const corridor=buildRiderCorridor(line.geometry.coordinates.map(toLocal),areas),profile={...riderProfile(0,0,line.properties.name),board:true,amplitude:10,wavelength:62};
  let positive=0,negative=0,leanPositive=false,leanNegative=false;
  for(let d=20;d<corridor.length-20;d+=2){const state=riderState(corridor,profile,d);assert.ok(Number.isFinite(state.heading));assert.ok(Math.abs(state.lean)<=.48);if(state.inside){assert.ok(insideRiderArea(state.point,areas));positive=Math.max(positive,state.offset);negative=Math.min(negative,state.offset);leanPositive||=state.lean>.01;leanNegative||=state.lean<-.01;}}
  if(positive>1&&negative< -1&&leanPositive&&leanNegative)carved++;
 }
 assert.equal(carved,6);
});
test('polygon holes and narrow edges cannot produce displayed riders outside a piste',()=>{
 const geometry={type:'Polygon',coordinates:[[[-8,0],[8,0],[8,120],[-8,120],[-8,0]],[[-2,48],[-2,62],[2,62],[2,48],[-2,48]]]};
 const areas=[{geometry,bounds:[-8,0,8,120]}],corridor=buildRiderCorridor([[0,1],[0,119]],areas),profile={speed:6,wavelength:40,amplitude:12,phase:0};
 for(let d=0;d<118;d+=.5){const state=riderState(corridor,profile,d);if(state.inside)assert.ok(insideRiderArea(state.point,areas));if(state.point[1]>48&&state.point[1]<62)assert.equal(state.inside,false);}
 assert.equal(riderState(corridor,profile,0).fade,0);assert.deepEqual(riderState(corridor,profile,17).point,riderState(corridor,profile,135).point);
});
