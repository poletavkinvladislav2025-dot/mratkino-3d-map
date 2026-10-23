import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {validateCommand} from '../src/region/integration.js';import {applyFilters,filterSnapshot,validateFilters} from '../src/region/filters.js';import {visibleLegendKinds} from '../src/region/legend.js';import {byId} from '../src/region/presets.js';
test('setFilters has a bounded schema, partial categories, deterministic views and no ambiguous modes',()=>{
 const base={ski:true,nordic:true,hiking:true,interesting:true,stamps:true,passport:false};
 for(const view of ['all','places','stamps','passport']){const p={view};assert.ok(validateCommand({type:'vb3d.command',version:1,id:'filter',command:'setFilters',payload:p}));assert.equal(filterSnapshot(applyFilters(base,p)).view,view);}
 for(const p of [{},{view:'bad'},{view:'stamps',stamps:false},{ski:'true'},{url:'https://bad.example'},{passport:1},[],null])assert.equal(validateFilters(p),false);
 assert.equal(applyFilters(base,{ski:false}).stamps,true);assert.equal(applyFilters(base,{passport:true}).stamps,true);assert.equal(applyFilters({...base,passport:true},{stamps:false}).passport,false);
 assert.equal(byId('kraka').name,'Хребет Крака');
});
test('legend is based on actual rendered routes and never lifts or the resort radius',()=>{
 let features=[];const map={getLayer:()=>true,getLayoutProperty:()=> 'visible',getContainer:()=>({clientWidth:800,clientHeight:600}),queryRenderedFeatures:()=>features};assert.deepEqual(visibleLegendKinds(map),[]);
 features=[{layer:{id:'winter-catalog-line'},properties:{category:'lift'}}];assert.deepEqual(visibleLegendKinds(map),[]);
 features.push({layer:{id:'winter-catalog-line'},properties:{category:'nordic'}});assert.deepEqual(visibleLegendKinds(map),['nordic']);
 features.push({layer:{id:'trail-line'},properties:{}},{layer:{id:'hiking-route-line'},properties:{}});assert.deepEqual(visibleLegendKinds(map),['hiking','nordic','ski']);
});
test('Yandex adapter accesses the real closure API, keeps source IDs separate, and suppresses echoes',()=>{
 const events=[],points=[{id:'stampStation'},{id:'kiosk3'}],locations=[{id:'malinovaya'},{id:'malinovaya1'}];
 const c={map:{},markers:[...locations.map(p=>({type:'location',dataId:p.id,placemark:{options:{set(){}}}})),...points.map(p=>({type:'kiosk',dataId:p.id,placemark:{options:{set(){}}}}))],locations,stampPoints:points,currentTab:'places',selectedIdx:0,isTransitioning:false,setTimeout,clearTimeout,window:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}};
 c.switchTab=name=>{c.currentTab=name;c.selectedIdx=-1;c.vbPassportOnly=false;c.vbYandexNotify();};c.navToLoc=id=>{c.switchTab('places');c.selectedIdx=c.markers.findIndex(m=>m.dataId===id);c.vbYandexNotify();};c.navToKiosk=id=>{c.switchTab('stamps');c.selectedIdx=c.markers.findIndex(m=>m.dataId===id);c.vbYandexNotify();};
 vm.createContext(c);vm.runInContext(fs.readFileSync('docs/snippets/yandex-adapter.js','utf8'),c);const a=c.window.VisitBeloretskYandex;assert.equal(a.hasPlace('malinovaya1'),true);assert.equal(a.hasPlace('abzakovo'),false);a.setFilter('passport');a.openPlace('kiosk3');assert.equal(a.getState().view,'passport');assert.equal(a.getState().sourceId,'kiosk3');assert.equal(events.length,0);c.navToLoc('malinovaya');assert.equal(events.at(-1).detail.sourceId,'malinovaya');
});
