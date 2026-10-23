import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeHerd,advanceHerd,validDeerPosition} from '../src/landscape/deer-motion.js';
import {inside,hash,tileCells} from '../src/landscape/spatial.js';
import {validateCommand} from '../src/region/integration.js';
import {createRegionalStyle} from '../src/region/style.js';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {visibleAreas} from '../src/region/viewport.js';
import ethno from '../src/landscape/ethnopark.json' with {type:'json'};
test('twenty independent deer stay within the closed pen, clear of chum and each other',()=>{
 const herd=makeHerd();assert.equal(herd.length,20);assert.deepEqual(herd,makeHerd());const positions=herd.map(a=>[a.x,a.y]);
 for(let step=0;step<6000;step++){advanceHerd(herd,.1);for(const a of herd){assert.ok(validDeerPosition(a.x,a.y));for(const b of herd)if(a.id<b.id)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=ethno.deer.separation-1e-9);}}
 assert.ok(herd.some((a,i)=>Math.hypot(a.x-positions[i][0],a.y-positions[i][1])>3));assert.ok(new Set(herd.map(a=>a.phase)).size>10);
 const before=JSON.stringify(herd);advanceHerd(herd,0);assert.equal(JSON.stringify(herd),before);
});
test('forest polygon holes and multipolygon gaps remain empty; world cells stable',()=>{
 const polygon={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[7,3],[7,7],[3,7],[3,3]]]};assert.equal(inside([1,1],polygon),true);assert.equal(inside([5,5],polygon),false);assert.equal(inside([12,5],polygon),false);assert.equal(hash(42,54),hash(42,54));
 const cells=tileCells([58.5,54.08],[[58.48,54.06],[58.52,54.10]],14,4);assert.equal(cells.length,4);assert.equal(new Set(cells.map(c=>c.id)).size,4);
});
test('new catalog keeps OSM IDs, obeys 200 km, and protocol accepts registered places and routes',()=>{
 const places=JSON.parse(fs.readFileSync('src/region/winter-places.json'));for(const p of places){if(p.id!=='ethnopark')assert.ok(p.distanceKm<=200);assert.ok(validateCommand({type:'vb3d.command',version:1,id:'p',command:'openPlace',payload:{placeId:p.id}}));if(p.geometryUrl){const data=JSON.parse(fs.readFileSync('public/'+p.geometryUrl));for(const f of data.features){assert.ok(f.properties.sourceUrl.startsWith('https://www.openstreetmap.org/way/'));assert.ok(validateCommand({type:'vb3d.command',version:1,id:'r',command:'openRoute',payload:{routeId:f.properties.routeId}}));}}}
});
test('style is valid for installed MapLibre and overview lines have hysteresis',()=>{
 const data={manifest:JSON.parse(fs.readFileSync('public/live/manifest.json')),trails:{type:'FeatureCollection',features:[]},facilities:{type:'FeatureCollection',features:[]}};assert.deepEqual(validateStyleMin(createRegionalStyle(data,null)),[]);
 const bounds={getWest:()=>58.4,getEast:()=>58.47,getSouth:()=>53.98,getNorth:()=>54.02},map={getZoom:()=>10.2,getBounds:()=>bounds};assert.deepEqual(visibleAreas(map),[]);assert.ok(visibleAreas(map,['mratkino']).includes('mratkino'));
});
test('real vector schema generates only semantic woodland, with deterministic coordinates and no fallback forest',async()=>{
 const {decodeLandscape}=await import('../src/landscape/generate.js'),{VectorTile}=await import('@mapbox/vector-tile'),{default:Pbf}=await import('pbf');
 const source=JSON.parse(fs.readFileSync('data/landscape/vector-test-source.json')),buffer=fs.readFileSync('tests/fixtures/world-forest.pbf');const result=decodeLandscape(buffer,source.cell),tile=new VectorTile(new Pbf(buffer)),woods=[];
 for(let i=0;i<tile.layers.landcover.length;i++){const f=tile.layers.landcover.feature(i).toGeoJSON(source.cell.x,source.cell.y,14);if(f.properties.class==='wood')woods.push(f.geometry);}
 assert.ok(result.points.length>100);assert.ok(result.points.every(p=>woods.some(g=>inside(p,g))));assert.deepEqual(result.points,decodeLandscape(buffer,source.cell).points);assert.equal(decodeLandscape(new Uint8Array(),source.cell).points.length,0);assert.equal(new Set(result.points.map(p=>p.slice(0,2).join(','))).size,result.points.length);
});
