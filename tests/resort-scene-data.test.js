import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {insideGeometry,saplingPlacements,toLocal,toLngLat,pathLength,samplePath,liftLoop,decodeForestInstances,forestLOD,treeAppearance,liftVehicle} from '../src/resort-scene-data.js';
const data=Object.fromEntries(['forest','trails','lifts'].map(name=>[name,JSON.parse(fs.readFileSync(`public/live/${name}.geojson`))]));
const bytes=fs.readFileSync('public/live/forest-instances.bin');
const pool=decodeForestInstances(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
test('dense forest candidates cover the full resort, respect real polygons, and never rewrite data',()=>{
 const polygon={type:'Polygon',coordinates:[[[0,0],[5,0],[5,5],[0,5],[0,0]],[[1,1],[2,1],[2,2],[1,2],[1,1]]]};
 assert.equal(insideGeometry([.5,.5],polygon),true);assert.equal(insideGeometry([1.5,1.5],polygon),false);
 assert(pool.count>70000);assert.equal(pool.spacing,10);
 const before=JSON.stringify(data);let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 for(let id=0;id<pool.count;id+=23){
  const [x,y,z]=pool.positions.subarray(id*3,id*3+3),ll=toLngLat([x,y]);
  assert(data.forest.features.some(f=>insideGeometry(ll,f.geometry)));assert(!data.trails.features.some(f=>insideGeometry(ll,f.geometry)));
  assert(z>400&&z<1000);west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);
  const appearance=treeAppearance(pool.seeds[id]);assert(appearance.height>=20&&appearance.height<=30);
 }
 assert(east-west>3500);assert(north-south>4000);assert(saplingPlacements(data).length>10);assert.equal(JSON.stringify(data),before);
 assert.throws(()=>decodeForestInstances(new ArrayBuffer(32)),/format/);
});
test('forest LOD retains broad canopy coverage and replaces nearby stands with individual pines',()=>{
 const far=forestLOD(pool,[58.4371909,53.9974603],{zoom:14}),mobile=forestLOD(pool,[58.4371909,53.9974603],{zoom:14,mobile:true});
 assert(far.far.length>18000);assert(far.near.length===0);assert(mobile.far.length>8000&&mobile.far.length<far.far.length);
 const id=2000,center=toLngLat(pool.positions.subarray(id*3,id*3+2));
 const close=forestLOD(pool,center,{zoom:18});assert(close.near.includes(id));assert(close.near.length>500);assert(close.far.length>15000);
});
test('local coordinates roundtrip and lift movement follows an equal-distance closed loop',()=>{
 const ll=[58.435,54.001],back=toLngLat(toLocal(ll));assert(Math.abs(back[0]-ll[0])<1e-9);assert(Math.abs(back[1]-ll[1])<1e-9);
 const line=[[0,0,700],[0,500,800],[20,1000,900]],loop=liftLoop(line,2.2),length=pathLength(loop);
 assert.deepEqual(loop[0],loop.at(-1));assert(length>2000);
 const start=samplePath(loop,0).point,end=samplePath(loop,length).point;assert(Math.hypot(...end.map((v,i)=>v-start[i]))<1e-8);
 assert.deepEqual(samplePath([[0,0,0],[100,0,0],[100,50,0]],125).point,[100,25,0]);
 const route={points:loop,length,ascentLength:pathLength(line),count:20,chair:false};
 assert(liftVehicle(route,0,10).ascending);assert(!liftVehicle(route,15,10).ascending);
 assert.deepEqual(liftVehicle(route,0,length/1.5).sample.point,loop[0]);
 for(let i=1;i<loop.length;i++)assert(Math.hypot(...loop[i].map((v,j)=>v-loop[i-1][j]))<520);
});
test('close-up forest culls distant stands outside the viewport while retaining local detail',()=>{
 const id=2000,center=toLngLat(pool.positions.subarray(id*3,id*3+2));
 const all=forestLOD(pool,center,{zoom:18});
 const local=toLocal(center),bounds=[toLngLat([local[0]-100,local[1]-100]),toLngLat([local[0]+100,local[1]+100])];
 const visible=forestLOD(pool,center,{zoom:18,bounds});
 assert(visible.near.includes(id));assert(visible.near.length>0);assert(visible.far.length<all.far.length/10);
});
