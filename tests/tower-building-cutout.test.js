import test from 'node:test';import assert from 'node:assert/strict';import {towerBuildingParts} from '../src/landscape/tower-building-cutout.js';
const ring=(x,y)=>[[x-1,y-1],[x+1,y-1],[x+1,y+1],[x-1,y+1],[x-1,y-1]];
test('tower cutout removes one member of a grouped vector building, preserves its neighbours and their heights, deduplicates overscaled tiles',()=>{
 const grouped={type:'Feature',id:90332960,properties:{render_height:5,render_min_height:0},geometry:{type:'MultiPolygon',coordinates:[[ring(0,0)],[ring(10,0)],[ring(20,0)]]}},other={...grouped,id:123,geometry:{type:'Polygon',coordinates:[ring(30,0)]}};
 const patch=towerBuildingParts([grouped,grouped,other],[0,0]);assert.deepEqual(patch.ids,[90332960]);assert.equal(patch.data.features.length,2);assert.deepEqual(patch.data.features.map(f=>f.geometry.coordinates[0]),[ring(10,0),ring(20,0)]);assert.ok(patch.data.features.every(f=>f.properties.render_height===5));assert.equal(towerBuildingParts([other],[0,0]).ids.length,0);
});
