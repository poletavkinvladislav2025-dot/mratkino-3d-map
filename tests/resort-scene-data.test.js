import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {insideGeometry,treePlacements,toLocal,toLngLat,pathLength,samplePath,liftLoop} from '../src/resort-scene-data.js';
const data=Object.fromEntries(['forest','trails','lifts'].map(name=>[name,JSON.parse(fs.readFileSync(`public/live/${name}.geojson`))]));
test('woodland sampling respects real polygons and holes; saplings identify C1 illustration',()=>{
 const polygon={type:'Polygon',coordinates:[[[0,0],[5,0],[5,5],[0,5],[0,0]],[[1,1],[2,1],[2,2],[1,2],[1,1]]]};
 assert.equal(insideGeometry([.5,.5],polygon),true);assert.equal(insideGeometry([1.5,1.5],polygon),false);assert.equal(insideGeometry([6,6],polygon),false);
 const before=JSON.stringify(data);const trees=treePlacements(data,450);
 const mature=trees.filter(t=>t.kind==='forest');assert.equal(mature.length,450);
 for(const t of mature){assert(data.forest.features.some(f=>insideGeometry(t.lngLat,f.geometry)));assert(!data.trails.features.some(f=>insideGeometry(t.lngLat,f.geometry)));}
 assert(trees.filter(t=>t.kind==='sapling').length>10);assert.equal(JSON.stringify(data),before);
 assert.deepEqual(treePlacements(data,450),trees);
});
test('local coordinates roundtrip and lift movement follows an equal-distance closed loop',()=>{
 const ll=[58.435,54.001],back=toLngLat(toLocal(ll));assert(Math.abs(back[0]-ll[0])<1e-9);assert(Math.abs(back[1]-ll[1])<1e-9);
 const line=[[0,0,700],[0,500,800],[20,1000,900]],loop=liftLoop(line,2.2),length=pathLength(loop);
 assert.deepEqual(loop[0],loop.at(-1));assert(length>2000);
 const start=samplePath(loop,0).point,end=samplePath(loop,length).point;assert(Math.hypot(...end.map((v,i)=>v-start[i]))<1e-8);
 const mid=samplePath([[0,0,0],[100,0,0],[100,50,0]],125);assert.deepEqual(mid.point,[100,25,0]);
 // A round trip must have two distinct lanes, never teleport through the slope.
 for(let i=1;i<loop.length;i++)assert(Math.hypot(...loop[i].map((v,j)=>v-loop[i-1][j]))<520);
});
