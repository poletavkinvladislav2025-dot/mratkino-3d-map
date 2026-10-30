import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PLACES} from '../src/region/presets.js';import {catalogLifeData,LIFT_TYPES} from '../src/region/catalog-life-data.js';import {riderProfile} from '../src/rider-motion.js';
test('every mapped downhill resort has both rider types and every supported mapped lift, within device budgets',()=>{
 let resorts=0;for(const place of PLACES.filter(p=>p.geometryUrl)){const source=JSON.parse(fs.readFileSync('public/'+place.geometryUrl));if(!source.features.some(f=>f.properties.category==='ski'))continue;resorts++;
 for(const mobile of [false,true]){const before=JSON.stringify(source),{data,profile}=catalogLifeData(place,source,mobile),count=profile.ridersPerSegment[mobile?'mobile':'desktop'];assert.ok(data.trails.features.length);assert.ok(count*data.trails.features.length<=(mobile?96:240));assert.ok(count>=2);assert.ok(data.lifts.features.every(f=>LIFT_TYPES.has(f.properties.tags.aerialway)));assert.equal(data.lifts.features.length,source.features.filter(f=>f.properties.category==='lift').length);
 const types=Array.from({length:count},(_,i)=>riderProfile(0,i,'mapped')).map(p=>p.board);assert.ok(types.includes(true)&&types.includes(false));assert.equal(JSON.stringify(source),before);assert.equal(profile.sampledGround,true);}
 }assert.equal(resorts,8);
});
test('closed and restricted slopes/lifts are not animated',()=>{
 const line=p=>({type:'Feature',properties:{id:'way/1',...p},geometry:{type:'LineString',coordinates:[[58,54],[58.01,54.01]]}}),source={features:[line({category:'ski',closed:true}),line({category:'ski',tags:{'piste:status':'closed'}}),line({category:'lift',tags:{aerialway:'chair_lift',access:'no'}})]};const {data}=catalogLifeData({coordinates:[58,54]},source);assert.equal(data.trails.features.length,0);assert.equal(data.lifts.features.length,0);
});
