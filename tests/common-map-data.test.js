import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {offsetRoutePixels} from '../src/integration/yandex-route-lines.js';
import {ROUTE_IDS,validateCommand} from '../src/region/integration.js';
const catalog=JSON.parse(fs.readFileSync('public/integration/route-catalog.json'));
test('both renderers use one route catalog with valid assets, route IDs and unchanged owner geometry',()=>{
 assert.equal(new Set(catalog.routes.map(r=>r.id)).size,catalog.routes.length);
 for(const r of catalog.routes){assert.ok(r.title);assert.ok(r.description);assert.match(r.color,/^#[a-f\d]{6}$/i);assert.ok(fs.existsSync('public/'+r.asset));if(r.displayAsset)assert.ok(fs.existsSync('public/'+r.displayAsset));assert.ok(validateCommand({type:'vb3d.command',version:1,id:'test',command:'openRoute',payload:{routeId:r.id}}),r.id);}
 for(const place of ['zavyaliha','sunny-valley']){assert.ok(catalog.routes.some(r=>r.placeId===place&&r.category==='ski'));assert.ok(catalog.routes.some(r=>r.placeId===place&&r.category==='lift'));}
 assert.equal(catalog.routes.filter(r=>r.id.startsWith('malinovaya/')).length,4);assert.equal(catalog.routes.filter(r=>r.id.startsWith('yalangas/')).length,2);assert.ok(ROUTE_IDS.includes('long-distance/gut'));
 assert.equal(catalog.routes.find(r=>r.id==='mratkino/trail/north-1').closed,true);
});
test('ordinary route lanes offset screen pixels and remain finite at sharp turns',()=>{
 const points=[[0,0],[100,0],[100,100]],original=JSON.stringify(points),shifted=offsetRoutePixels(points,5);assert.deepEqual(shifted[0],[0,5]);assert.deepEqual(shifted.at(-1),[95,100]);assert.equal(JSON.stringify(points),original);assert.deepEqual(offsetRoutePixels(points,0),points);for(const p of offsetRoutePixels([[0,0],[100,0],[0,0]],5))for(const n of p)assert.ok(Number.isFinite(n));
});
