import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {cameraPayload,validateCommand,permittedOrigin,readURLState,ROUTE_IDS} from '../src/region/integration.js';
import {classification,decoratePistes} from '../src/region/piste-catalog.js';
import {visibleAreas} from '../src/region/viewport.js';
const command=(command,payload)=>({type:'vb3d.command',version:1,id:'test-1',command,payload});
test('integration accepts explicit coordinates, stable IDs and only bounded schemas',()=>{
 assert.deepEqual(cameraPayload({center:{lat:53.8,lng:58.6},zoom:14}),{center:[58.6,53.8],zoom:14});
 for(const payload of [{},{center:[58,54]},{center:{lat:100,lng:58}},{zoom:NaN},{pitch:73},{zoom:'14'},{zoom:14,unexpected:1}])assert.equal(cameraPayload(payload),null);
 for(const id of ROUTE_IDS)assert.ok(validateCommand(command('openRoute',{routeId:id})));
 for(const payload of [{routeId:'abzakovo/trail/6'},{placeId:'arbitrary'},{placeId:'mratkino',url:'https://invalid.test'}])assert.equal(validateCommand(command('openPlace',payload)),null);
 assert.equal(validateCommand({...command('resize',{}),version:2}),null);
 assert.equal(validateCommand(command('setCamera',{center:{lat:54,lng:58},zoom:30})),null);
 assert.equal(validateCommand(command('resume',{value:true})),null);
 assert.equal(permittedOrigin('https://example.org','http://localhost'),'https://example.org');
 for(const origin of ['*','null','https://example.org/','https://example.org/path','javascript:alert(1)','https://user@example.org'])assert.equal(permittedOrigin(origin,'http://localhost'),null);
 assert.equal(permittedOrigin(null,'https://own.example'),'https://own.example');
 assert.deepEqual(readURLState('?place=abzakovo&route=abzakovo%2Ftrail%2F1&lat=53.8&lng=58.6&z=14&effects=1&card=0'),{place:'abzakovo',route:'abzakovo/trail/1',card:false,effects:true,camera:{center:[58.6,53.8],zoom:14}});
});
test('official categories override OSM without changing original segments or geometry',()=>{
 const raw=JSON.parse(fs.readFileSync('public/region/abzakovo/trails.geojson')),before=JSON.stringify(raw),decorated=decoratePistes('abzakovo',raw);
 assert.equal(JSON.stringify(raw),before);assert.deepEqual(decorated.features.map(f=>f.geometry),raw.features.map(f=>f.geometry));
 assert.equal(decorated.features.filter(f=>f.properties.number==='1').length,3);
 for(const [number,color] of [['1','#176ac0'],['2','#26333c'],['5','#d0343d'],['9','#178154']])assert.equal(classification('abzakovo',{number}).color,color);
 assert.equal(classification('mratkino',{difficulty_osm:'easy'}).verified,false);
 assert.equal(classification('mratkino',{}).category,'unknown');
});
test('viewport loading is independent of selected place and respects zoom',()=>{
 const bounds={getWest:()=>58.60,getEast:()=>58.65,getSouth:()=>53.78,getNorth:()=>53.81};
 assert.deepEqual(visibleAreas({getZoom:()=>14,getBounds:()=>bounds}),['abzakovo']);
 assert.deepEqual(visibleAreas({getZoom:()=>10,getBounds:()=>bounds}),[]);
});
