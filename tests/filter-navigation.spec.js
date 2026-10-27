import {test,expect} from './tile-fixture.js';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('public/integration/map-catalog.json','utf8'));
function fakeYandex(){
 const calls=[];window.yandexCalls=calls;
 class Map{constructor(container){this.container={fitToViewport(){}};this.geoObjects={add(p){window.yandexMarkers.push(p);}};this.converter={coordinatesToGlobalPixels:p=>p,globalPixelsToCoordinates:p=>p};this.zoom=11;window.yandexMap=this;}
 setBounds(bounds,options){calls.push({action:'bounds',bounds,options});this.bounds=bounds;this.zoom=bounds[1][0]-bounds[0][0]<.1?14:10;return Promise.resolve();}
 setCenter(center,zoom){calls.push({action:'center',center,zoom});this.zoom=zoom;return Promise.resolve();}
 getZoom(){return this.zoom;}setZoom(z){this.zoom=z;}getGlobalPixelCenter(){return [0,0];}}
 class Placemark{constructor(coords){this.coords=coords;this.values={};this.options={set:(k,v)=>this.values[k]=v};this.geometry={getCoordinates:()=>coords};this.events={add:(name,fn)=>this.click=fn};}}
 window.yandexMarkers=[];window.ymaps={ready:fn=>fn(),Map,Placemark};
}
for(const mobile of [false,true])test(`complete ordinary block filters data and frames correct bounds ${mobile?'mobile':'desktop'}`,async({page})=>{
 await page.setViewportSize(mobile?{width:390,height:844}:{width:1365,height:900});await page.addInitScript(fakeYandex);await page.route('**/integration/complete-demo.html',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync('tests/fixtures/tilda-complete.html','utf8')}));await page.goto('/integration/complete-demo.html');
 await expect(page.locator('#vb-map-modes')).toHaveAttribute('data-mode','yandex');expect(await page.evaluate(()=>window.yandexMarkers.length)).toBe(52);
 const choose=async view=>mobile?page.locator('#vb-map-modes select').selectOption(view):page.locator('[data-filter="'+view+'"]').click();
 for(const view of ['stamps','passport','places','stamps','passport']){
  await choose(view);const state=await page.evaluate(()=>({view:window.VisitBeloretskYandex.getState(),visible:window.yandexMarkers.map((p,i)=>p.values.visible?i:-1).filter(i=>i>=0),last:window.yandexCalls.at(-1)}));
  expect(state.view.view).toBe(view);expect(state.view.sourceId).toBeNull();const expected=catalog.filter(p=>view==='places'?p.kind!=='stamp-point':p.kind==='stamp-point'&&(view!=='passport'||p.sellsPassports));expect(state.visible).toHaveLength(expected.length);
  const visible=state.visible.map(i=>catalog.filter(p=>p.kind!=='stamp-point').concat(catalog.filter(p=>p.kind==='stamp-point'))[i]);expect(visible.map(p=>p.id).sort()).toEqual(expected.map(p=>p.id).sort());
  expect(state.last.action).toBe('bounds');if(view==='places')expect(state.last.bounds).toEqual([[53.75,58.25],[54.07,58.72]]);else for(const p of expected){expect(p.coords[0]).toBeGreaterThanOrEqual(state.last.bounds[0][0]);expect(p.coords[0]).toBeLessThanOrEqual(state.last.bounds[1][0]);}
 }
 await page.evaluate(()=>window.VisitBeloretskYandex.openPlace('kiosk3'));await expect(page.locator(mobile?'#vbT1Mcard':'#vbT1Panel')).toContainText('Центральная площадь');await choose('places');await page.waitForTimeout(350);await expect(page.locator('#vbT1Panel')).not.toHaveClass(/--open/);await expect(page.locator('#vbT1Mcard')).not.toHaveClass(/--visible/);
 expect(await page.evaluate(()=>window.VisitBeloretskYandex.canonicalId('malinovaya1'))).toBe('malinovaya');expect(await page.evaluate(()=>window.VisitBeloretskYandex.canonicalId('malinovaya'))).toBe('malinovaya-3');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`renders/filter-ordinary-${mobile?'mobile':'desktop'}.png`});
});
for(const mobile of [false,true])test(`real 3D iframe filter button changes camera and clears old card ${mobile?'mobile':'desktop'}`,async({page})=>{
 test.setTimeout(240000);await page.setViewportSize(mobile?{width:390,height:844}:{width:1365,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/integration/unified-demo.html');const app=page.frameLocator('iframe').locator('mratkino-map');
 await expect.poll(()=>app.evaluate(e=>!!e.region?.bridge.ready),{timeout:90000}).toBe(true);const choose=async view=>mobile?page.locator('#vb-map-modes select').selectOption(view):page.locator('#vb-map-modes [data-filter="'+view+'"]').click();
 await app.evaluate(e=>{e.$('[data-layer=forest]').checked=false;e.region.choose('kiosk3',false,{navigate:false});e.map.jumpTo({center:[58.2,54.1],zoom:17.5});});
 for(const view of ['stamps','passport','places','stamps']){
  await choose(view);await expect.poll(()=>app.evaluate(e=>({id:e.region.id,view:e.region.filters.passport?'passport':e.region.filters.stamps?'stamps':'places'})),{timeout:30000}).toEqual({id:'all',view});
  const state=await app.evaluate(e=>({zoom:e.map.getZoom(),card:e.region.cardOpen,visible:e.region.markers.filter(m=>m.p.kind==='stamp-point'&&getComputedStyle(m.element).visibility==='visible').map(m=>m.p.id),bounds:e.map.getBounds().toArray()}));expect(state.card).toBe(false);
  if(view==='places'){expect(state.zoom).toBeLessThan(12);await expect.poll(()=>app.evaluate(e=>e.region.markers.filter(m=>m.p.kind==='stamp-point'&&getComputedStyle(m.element).visibility==='visible').length),{timeout:30000}).toBe(0);}else{expect(state.zoom).toBeGreaterThan(12.4);expect(state.zoom).toBeLessThan(16);await expect.poll(()=>app.evaluate(e=>e.region.markers.filter(m=>m.p.kind==='stamp-point'&&getComputedStyle(m.element).visibility==='visible').length),{timeout:30000}).toBe(view==='stamps'?6:5);}
 }
 await page.screenshot({path:`renders/filter-3d-${mobile?'mobile':'desktop'}.png`,timeout:60000});
});
