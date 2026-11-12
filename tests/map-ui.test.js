import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {placePresentation,labelRank} from '../src/region/presentation.js';
import {byId} from '../src/region/presets.js';
import {validateCommand} from '../src/region/integration.js';
test('overview landmark labels outrank ordinary places and selected places remain first',()=>{
 for(const id of ['narrowGauge2','waterTower','malinovaya']){const p=byId(id),view=placePresentation(p);assert.ok(view.labelPriority>=98);assert.ok(view.labelMinZoom<10);assert.ok(labelRank(p,'all')>labelRank(byId('ethnopark'),'all'));}
 assert.ok(labelRank(byId('ethnopark'),'ethnopark')>labelRank(byId('narrowGauge2'),'ethnopark'));assert.ok(placePresentation(byId('malinovaya-2')).labelMinZoom>=12);
 const catalog=JSON.parse(fs.readFileSync('public/integration/map-catalog.json'));for(const id of ['narrowGauge2','waterTower','malinovaya']){const p=byId(id);assert.deepEqual(catalog.find(x=>x.canonicalId===id).labelPriority,placePresentation(p).labelPriority);}
});
test('layer opening has a bounded command schema and cannot inject arbitrary panel payloads',()=>{
 const command=payload=>({type:'vb3d.command',version:1,id:'layers',command:'openLayers',payload});assert.ok(validateCommand(command({})));assert.equal(validateCommand(command({url:'https://example.com'})),null);
});

test('phone welcome bounds contain the local landmarks and Abzakovo without expanding to long trails',async()=>{
 const {welcomeView}=await import('../src/integration/welcome-view.js');const compact=welcomeView(390),desktop=welcomeView(1440);
 for(const id of ['malinovaya','mratkino','waterTower','narrowGauge2','abzakovo']){const [lng,lat]=byId(id).coordinates;assert.ok(lng>=compact.bounds[0][0]&&lng<=compact.bounds[1][0]);assert.ok(lat>=compact.bounds[0][1]&&lat<=compact.bounds[1][1]);}
 assert.ok(compact.bounds[1][0]-compact.bounds[0][0]<desktop.bounds[1][0]-desktop.bounds[0][0]);assert.ok(compact.padding<desktop.padding);assert.ok(compact.pitch<desktop.pitch);
});
