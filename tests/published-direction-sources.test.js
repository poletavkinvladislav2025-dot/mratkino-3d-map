import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import catalog from '../src/region/direction-catalog.json' with {type:'json'};
const folder='data/directions/source/published-20261115/',manifest=JSON.parse(fs.readFileSync(folder+'manifest.json')),geometry=JSON.parse(fs.readFileSync('public/region/directions/routes.geojson')),audit=JSON.parse(fs.readFileSync('data/directions/build-audit.json'));
function points(text){return [...text.matchAll(/<(?:\w+:)?trkpt\s+([^>]+)>/g)].map(m=>[Number(m[1].match(/lon="([^"]+)"/)[1]),Number(m[1].match(/lat="([^"]+)"/)[1])]);}
test('published replacements preserve source vertices, actual GPX starts and exact download lines',()=>{
 for(const s of manifest){const raw=fs.readFileSync(folder+s.file),all=points(raw.toString()),r=catalog.routes.find(r=>r.id===s.routeId),line=geometry.features.find(f=>f.id===s.routeId).geometry.coordinates,a=audit.routes.find(a=>a.routeId===s.routeId).provenance;
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),s.sha256);assert.equal(all.length,s.vertices);assert.equal(r.geometrySource,'source_gpx');assert.deepEqual(line,a.selectedOriginalIndices.map(i=>all[i]));assert.deepEqual(points(fs.readFileSync('public/region/directions/'+s.routeId+'.gpx','utf8')),line);assert.deepEqual(r.points.find(p=>p.id===r.startPointId).coordinates,line[0]);assert.ok(a.goalGapM<100);assert.ok(r.lineDistanceM>3000&&r.lineDistanceM<25000);
  if(!s.reverse&&!s.clipAtGoal)assert.deepEqual(line,all);
  if(s.reverse){assert.equal(a.selectedOriginalIndices[0],all.length-1);assert.ok(a.selectedOriginalIndices.at(-1)>0);}
 }
});
test('unconfirmed short approaches remain partial and distances distinguish outward/return legs',()=>{
 for(const id of ['kirel-otnurok','arvyak-ryaz-shigaevo']){const r=catalog.routes.find(r=>r.id===id);assert.equal(r.buildStatus,'partial');assert.equal(r.publicReady,false);assert.ok(r.statusReason);}
 const r=catalog.routes.find(r=>r.id==='kirel-otnurok');assert.ok(r.lineDistanceM>10000);assert.ok(Math.abs(r.distanceM-2*r.lineDistanceM)<=1);
 const sh=catalog.routes.find(r=>r.id==='arvyak-ryaz-shigaevo');assert.ok(sh.points.some(p=>p.role==='start-finish'&&p.precision.includes('not_verified')));
});

test('previously published GPX geometry remains unchanged',()=>{const expected={"inzerskie-tirlyan": "08bf3cc68cc6e2f076970142f86975941acf3225c4b769f200d9faa25d646210", "kurtashtau-station": "26d1ec8b67b2bcfa76d2421c4777a142fdcd94ea882a094aa276a2d8f80de7f1", "arvyak-ryaz-main": "64b67ca3d5c38ce29ef2966daf54c079cd1f8da581ca09e8a379e57c2bed6699", "kirel-kuzgun": "9e3b65cf4ae54410e50180ebc6f8267b9b3f88fd546f15566fb59a70c498457c", "bolshoy-shatak-avzyan": "0b65dc5d0b7505ff6ba86b885cfa9d4d6b49e4490ea1be04c9234b88ecb4b84a", "kushay-abzakovo": "90b86a743ac2fb8b9bd9b11c931c3a1c93c97601c80f34aa37a86f09efb77613"};for(const [id,hash] of Object.entries(expected))assert.equal(catalog.routes.find(r=>r.id===id).sourceGeometrySha256,hash);});
