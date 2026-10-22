import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {ACTIVE_RIDER_TRAILS,ridersPerTrail,riderProfile,localRiderAreas,riderAreasForTrail,buildRiderCorridor,riderState,insideRiderArea,advanceCrowd} from '../src/rider-motion.js';
import {toLocal} from '../src/resort-scene-data.js';
const features=JSON.parse(fs.readFileSync('public/live/trails.geojson')).features;
test('crowd budgets, individual profiles and closed piste exclusion',()=>{
 assert.equal(ridersPerTrail(false)*ACTIVE_RIDER_TRAILS.size,360);assert.equal(ridersPerTrail(true)*ACTIVE_RIDER_TRAILS.size,144);assert.equal(ACTIVE_RIDER_TRAILS.has('С1'),false);
 const profiles=Array.from({length:60},(_,i)=>riderProfile(0,i,'Ю4'));assert.equal(new Set(profiles.map(p=>p.speed)).size,60);assert.ok(profiles.some(p=>p.board)&&profiles.some(p=>!p.board));
});
test('actual pistes support arcs inside mapped polygons, with real lateral travel and both lean directions',()=>{
 const areas=localRiderAreas(features);let carved=0;
 for(const line of features.filter(f=>f.geometry.type==='LineString'&&ACTIVE_RIDER_TRAILS.has(f.properties.name))){
  const corridor=buildRiderCorridor(line.geometry.coordinates.map(toLocal),riderAreasForTrail(areas,line.properties.name)),profile={...riderProfile(0,0,line.properties.name),board:true,lane:.5,amplitude:10,wavelength:62};
  let positive=-Infinity,negative=Infinity,leanPositive=false,leanNegative=false;
  for(let d=20;d<corridor.length-20;d+=2){const state=riderState(corridor,profile,d);assert.ok(Number.isFinite(state.heading));assert.ok(Math.abs(state.lean)<=.48);if(state.inside){assert.ok(insideRiderArea(state.point,areas));positive=Math.max(positive,state.offset);negative=Math.min(negative,state.offset);leanPositive||=state.lean>.01;leanNegative||=state.lean<-.01;}}
  if(positive-negative>2&&leanPositive&&leanNegative)carved++;
 }
 assert.equal(carved,6);
});
test('polygon holes and narrow edges cannot produce displayed riders outside a piste',()=>{
 const geometry={type:'Polygon',coordinates:[[[-8,0],[8,0],[8,120],[-8,120],[-8,0]],[[-2,48],[-2,62],[2,62],[2,48],[-2,48]]]};
 const areas=[{geometry,bounds:[-8,0,8,120]}],corridor=buildRiderCorridor([[0,1],[0,119]],areas),profile={speed:6,wavelength:40,amplitude:12,phase:0};
 for(let d=0;d<118;d+=.5){const state=riderState(corridor,profile,d);if(state.inside)assert.ok(insideRiderArea(state.point,areas));if(state.point[1]>48&&state.point[1]<62)assert.equal(state.inside,false);}
 assert.equal(riderState(corridor,profile,0).fade,0);assert.deepEqual(riderState(corridor,profile,17).point,riderState(corridor,profile,135).point);
});

test('wide asymmetric polygons distribute people across the actual width rather than a centre strip',()=>{
 const areas=[{geometry:{type:'Polygon',coordinates:[[[-15,0],[85,0],[85,600],[-15,600],[-15,0]]]},bounds:[-15,0,85,600]}];
 const corridor=buildRiderCorridor([[0,1],[0,599]],areas),offsets=[];
 for(let i=0;i<60;i++)for(const d of [200,250,300]){const s=riderState(corridor,riderProfile(0,i,'Ю4'),d);assert.equal(s.inside,true);offsets.push(s.point[0]);}
 assert.ok(Math.min(...offsets)< -10);assert.ok(Math.max(...offsets)>78);
});

test('lean follows the inside of the turn in the model coordinate system',()=>{
 const areas=[{geometry:{type:'Polygon',coordinates:[[[-30,0],[30,0],[30,200],[-30,200],[-30,0]]]},bounds:[-30,0,30,200]}],corridor=buildRiderCorridor([[0,0],[0,200]],areas),profile={speed:6,wavelength:40,amplitude:5,phase:0};
 // Heading north: leftward displacement peaks at d=50, then turns right (+local X).
 assert.ok(riderState(corridor,profile,50).lean>0);assert.ok(riderState(corridor,profile,70).lean<0);
});

test('360 riders reserve space across merging pistes and make progress without overlapping',()=>{
 const areas=localRiderAreas(features),closed=areas.filter(a=>a.id==='relation/12615529'),agents=[];
 for(const [ri,line] of features.filter(f=>f.geometry.type==='LineString'&&ACTIVE_RIDER_TRAILS.has(f.properties.name)).entries()){
  const corridor=buildRiderCorridor(line.geometry.coordinates.map(toLocal),riderAreasForTrail(areas,line.properties.name));
  for(let i=0;i<60;i++)agents.push({corridor,profile:riderProfile(ri,i,line.properties.name),distance:(i+.37)/60*corridor.length,active:false});
 }
 const start=agents.map(a=>a.distance);let visibleCount=0;
 for(let frame=0;frame<60;frame++){
  const states=advanceCrowd(agents,.1,{initial:frame===0,blocked:p=>insideRiderArea(p,closed)}),visible=states.filter(s=>s?.clear&&s.inside&&s.fade>.2);visibleCount=Math.max(visibleCount,visible.length);
  assert.ok(visible.every(s=>!insideRiderArea(s.point,closed)));
  for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++)assert.ok(Math.hypot(visible[i].point[0]-visible[j].point[0],visible[i].point[1]-visible[j].point[1])>=2.8-1e-6);
 }
 assert.ok(visibleCount>300);assert.ok(agents.filter((a,i)=>a.distance>start[i]+1).length>300);
});
