import test from 'node:test';import assert from 'node:assert/strict';
import {parallelRoutes} from '../src/parallel-routes.js';
const line=(id,coords)=>({type:'Feature',properties:{id},geometry:{type:'LineString',coordinates:coords}});
const input=features=>({id:'local',perFeature:true,data:{type:'FeatureCollection',features}});
const a=[58.3,54],b=[58.301,54];
test('two or three coincident routes use separate lanes even with reversed traversal',()=>{
 for(const count of [2,3]){const features=[line('a',[a,b,a]),line('b',[b,a]),line('c',[a,b])].slice(0,count),before=JSON.stringify(features),result=parallelRoutes([input(features)]).local.features,lanes=new Map();
  for(const f of result){assert.equal(f.properties.overlapCount,count);const coords=f.geometry.coordinates,sign=coords.at(-1)[0]>coords[0][0]?1:-1;const lane=f.properties.renderOffset*sign;if(!lanes.has(f.properties.id))lanes.set(f.properties.id,new Set());lanes.get(f.properties.id).add(lane);}
  assert.equal(new Set([...lanes.values()].flatMap(s=>[...s])).size,count);for(const set of lanes.values())assert.equal(set.size,1);assert.equal(JSON.stringify(features),before);
 }
});
test('parallel lines within five metres separate; crossings and distinct paths stay centered',()=>{
 const result=parallelRoutes([input([line('a',[a,b]),line('b',[[58.3,54.00002],[58.301,54.00002]]),line('c',[[58.3005,53.999],[58.3005,54.001]]),line('d',[[58.3,54.002],[58.301,54.002]])])]).local.features;
 assert.ok(result.some(f=>f.properties.id==='a'&&f.properties.renderOffset!==0));for(const f of result.filter(f=>['c','d'].includes(f.properties.id)))assert.equal(f.properties.renderOffset,0);
});
