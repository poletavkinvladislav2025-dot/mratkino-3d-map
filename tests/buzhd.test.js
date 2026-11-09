import test from 'node:test';
import assert from 'node:assert/strict';
import {addBuzhdLayers,validateBuzhd,BUZHD_POINTS} from '../src/region/buzhd.js';
test('BUZHD keeps disconnected source geometry and derives bounds from every component',()=>{
 const feature=(line,coordinates,type='LineString',structure)=>({type:'Feature',properties:{line,structure},geometry:{type,coordinates}});
 const data={type:'FeatureCollection',features:[feature('north',[[58.1,54],[58.2,54.1]]),feature('south',[[[58.5,53.9],[58.6,54]],[[59,54.5],[59.1,54.6]]],'MultiLineString'),feature('peat',[[58,54],[58.1,54.1]],'LineString','мост')]};
 const before=JSON.stringify(data),style={sources:{},layers:[],terrain:{source:'dem'}};
 assert.deepEqual(addBuzhdLayers(style,data),[[58,53.9],[59.1,54.6]]);
 assert.equal(JSON.stringify(data),before);assert.equal(style.sources.buzhd.data,data);assert.equal(style.sources.buzhd.tolerance,0);assert.deepEqual(style.terrain,{source:'dem'});
 assert.deepEqual(style.layers.find(l=>l.id==='buzhd-peat').paint['line-dasharray'],[2,8/3]);assert.equal(style.layers.find(l=>l.id==='buzhd-peat-structure').paint['line-width'],6);
 assert.match(style.sources.buzhd.attribution,/OpenStreetMap.*ODbL/);
});
test('BUZHD never substitutes unknown coordinates or builds an empty route',()=>{
 assert.throws(()=>validateBuzhd(null),/DATA_MISSING/);
 assert.throws(()=>validateBuzhd({type:'FeatureCollection',features:[]}),/DATA_MISSING/);
 assert.throws(()=>validateBuzhd({type:'FeatureCollection',features:[{type:'Feature',properties:{line:'north'},geometry:{type:'LineString',coordinates:[[null,54],[58,54]]}}]}),/INVALID_COORDINATE/);
 assert.deepEqual(BUZHD_POINTS.find(p=>p.id==='gr231').coordinates,[58.33854,53.95218]);
});
