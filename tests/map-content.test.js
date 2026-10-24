import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PLACES,CITY,presetFor} from '../src/region/presets.js';import {content,routeName,routeDescription} from '../src/region/card-content.js';import {LONG_DISTANCE_ROUTES} from '../src/region/long-distance.js';
test('complete place copy and long-trail links do not replace owner data or route geometry',()=>{
 assert.deepEqual(Object.keys(content.places).sort(),[CITY,...PLACES].map(p=>p.id).sort());
 for(const p of [CITY,...PLACES]){assert.ok(p.description.length>45,p.id);assert.ok(!/уточня|требует сверки|Точка перенесена|Горная вершина Южного Урала\.$/.test(p.description),p.id);assert.deepEqual(Object.keys(content.places[p.id]),['description']);}
 assert.deepEqual(LONG_DISTANCE_ROUTES.map(r=>[r.name,r.sourcePage]),[['Большая Уральская тропа','https://www.greaturaltrail.ru/'],['Южноуральская тропа','https://suraltrail.ru/']]);
 for(const id of ['bannoye','rodeo','ufa-biathlon','abzakovo-biathlon'])for(const f of JSON.parse(fs.readFileSync('public/region/catalog/'+id+'.geojson')).features){assert.ok(!/Маршрут OSM|Участок OSM/.test(routeName(f.properties)));assert.ok(routeDescription(id,f.properties).length>20);}
 const local=presetFor('all').bounds;for(const id of ['beloretsk','mratkino','abzakovo']){const p=id==='beloretsk'?CITY:PLACES.find(p=>p.id===id);assert.ok(p.coordinates[0]>local[0][0]&&p.coordinates[0]<local[1][0]&&p.coordinates[1]>local[0][1]&&p.coordinates[1]<local[1][1]);}assert.ok(local[1][0]-local[0][0]<.6&&local[1][1]-local[0][1]<.4);
});
