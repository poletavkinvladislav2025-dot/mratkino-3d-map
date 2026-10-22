import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {natureTiles,natureTreeBudget} from '../src/region/nature-data.js';
const json=path=>JSON.parse(fs.readFileSync(path));
test('five built-in walking variants use only connected, attributable OSM edges and preserve waypoint order',()=>{
 let routes=0;
 for(const area of ['malinovaya','yalangas']){
  const dir=`public/region/hiking/${area}`,data=json(dir+'/routes.geojson'),audit=json(dir+'/route-audit.json');
  for(const route of audit.routes){
   const line=data.features.find(f=>f.geometry.type==='LineString'&&f.properties.id===route.id);routes++;assert.equal(line.properties.verified,false);assert.equal(line.geometry.coordinates.length,route.nodes.length);
   let last=-1;
   for(const key of route.via){const index=route.nodes.indexOf(audit.stops[key].node,last+1);assert.ok(index>=0,`${route.id} misses ${key}`);last=index;assert.ok(audit.stops[key].snapDistanceM<20);}
   for(let i=0;i<route.nodes.length-1;i++){
    const a=route.nodes[i],b=route.nodes[i+1],way=audit.ways[route.edgeWayIds[i]];assert.ok(way);assert.notEqual(way.tags.foot,'no');
    assert.ok(way.nodes.some((n,j)=>j>0&&((n===a&&way.nodes[j-1]===b)||(n===b&&way.nodes[j-1]===a))));assert.deepEqual(line.geometry.coordinates[i],audit.nodes[a]);
   }
   if(route.id==='first-return'){const c=line.geometry.coordinates;assert.equal(c.length%2,1);for(let i=0;i<c.length;i++)assert.deepEqual(c[i],c[c.length-1-i]);}
   if(route.id==='three-peaks'){assert.deepEqual(route.via,['bel','first','second','third','otn']);assert.notDeepEqual(line.geometry.coordinates[0],line.geometry.coordinates.at(-1));}
  }
 }
 assert.equal(routes,5);
 const second=json('public/region/hiking/malinovaya/route-audit.json').stops.second;assert.equal(second.osmId,'node/2031955366');assert.deepEqual(second.coordinates,[58.3062014,54.0080719]);assert.ok(second.requestedToPeakDistanceM<1);
});
test('nature detail is camera-tiled, bounded on mobile and released outside the two local areas',()=>{
 const index=json('public/region/hiking/malinovaya/nature-index.json');assert.equal(index.routeBufferM,250);assert.equal(index.summitRadiusM,500);assert.equal(json('public/region/hiking/yalangas/nature-index.json').summitRadiusM,700);
 const bounds=[[58.29,53.98],[58.35,54.04]],center=[58.315,54.004];
 assert.equal(natureTiles(index,center,bounds,12,false).length,0);assert.ok(natureTiles(index,center,bounds,15,false).length<=4);assert.ok(natureTiles(index,center,bounds,15,true).length<=2);assert.ok(natureTiles(index,center,bounds,15,false).length>0);
 assert.equal(natureTiles(index,[58.437,53.997],[[58.42,53.98],[58.46,54.02]],16).length,0);assert.equal(natureTreeBudget(false),2400);assert.equal(natureTreeBudget(true),700);
 for(const tile of index.tiles){const cell=json(`public/region/hiking/malinovaya/${tile.url}`);assert.equal(cell.trees.length,tile.trees);for(const p of cell.trees)assert.ok(p[0]>=tile.bounds[0]&&p[0]<=tile.bounds[2]&&p[1]>=tile.bounds[1]&&p[1]<=tile.bounds[3]);}
});
