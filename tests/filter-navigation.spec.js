import {test,expect} from './tile-fixture.js';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('public/integration/map-catalog.json','utf8'));
import {fakeYandex} from './fixtures/fake-yandex.js';
for(const mobile of [false,true])test(`complete ordinary block filters data and frames correct bounds ${mobile?'mobile':'desktop'}`,async({page})=>{
 await page.setViewportSize(mobile?{width:390,height:844}:{width:1365,height:900});await page.addInitScript(fakeYandex);await page.route('**/integration/complete-demo.html',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync('tests/fixtures/tilda-complete.html','utf8')}));await page.goto('/integration/complete-demo.html');
 await expect(page.locator('#vb-map-modes')).toHaveAttribute('data-mode','yandex');expect(await page.evaluate(()=>window.yandexMarkers.length)).toBe(52);
 const choose=async view=>mobile?page.locator('#vb-map-modes select').selectOption(view):page.locator('[data-filter="'+view+'"]').click();
 for(const view of ['stamps','passport','places','stamps','passport']){
  await choose(view);const state=await page.evaluate(()=>({view:document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.getState(),visible:window.yandexMarkers.map((p,i)=>p.values.visible?i:-1).filter(i=>i>=0),last:window.yandexCalls.at(-1)}));
  expect(state.view.view).toBe(view);expect(state.view.sourceId).toBeNull();const expected=catalog.filter(p=>view==='places'?p.kind!=='stamp-point':p.kind==='stamp-point'&&(view!=='passport'||p.sellsPassports));expect(state.visible).toHaveLength(expected.length);
  const visible=state.visible.map(i=>catalog.filter(p=>p.kind!=='stamp-point').concat(catalog.filter(p=>p.kind==='stamp-point'))[i]);expect(visible.map(p=>p.id).sort()).toEqual(expected.map(p=>p.id).sort());
  expect(state.last.action).toBe('bounds');if(view==='places')expect(state.last.bounds).toEqual([[53.75,58.25],[54.07,58.72]]);else for(const p of expected){expect(p.coords[0]).toBeGreaterThanOrEqual(state.last.bounds[0][0]);expect(p.coords[0]).toBeLessThanOrEqual(state.last.bounds[1][0]);}
 }
 await page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.openPlace('kiosk3'));await expect(page.locator(mobile?'#vbT1Mcard':'#vbT1Panel')).toContainText('Центральная площадь');await choose('places');await page.waitForTimeout(350);await expect(page.locator('#vbT1Panel')).not.toHaveClass(/--open/);await expect(page.locator('#vbT1Mcard')).not.toHaveClass(/--visible/);
 expect(await page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.canonicalId('malinovaya1'))).toBe('malinovaya');expect(await page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.canonicalId('malinovaya'))).toBe('malinovaya-3');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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

test('published Tilda combination upgrades an existing legacy map and isolates filters from old handlers',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(fakeYandex);
 const old=fs.readFileSync('tests/fixtures/tilda-legacy-map.html','utf8');
 await page.route('**/integration/migration-test.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>#vb-map-modes button{display:none!important}</style><div class="t-rec" id="legacy-record">${old}</div><script>window.oldFilterClicks=0;document.addEventListener('click',e=>{if(e.target.closest('[data-filter],.vb-t1__tab')){window.oldFilterClicks++;document.querySelector('.vb-t1__map').dataset.mode='yandex';}});window.VisitBeloretskYandex={version:1,legacy:true};</script><div class="t-rec"><script src="tilda-map-block.js?v=20261027-filters" data-default-mode="3d" defer></script></div>`}));
 await page.goto('/integration/migration-test.html');
 const block=page.locator('.vb-map-complete');await expect(page.locator('#legacy-record')).toBeHidden();await expect(block.locator('#vb-map-modes')).toHaveAttribute('data-mode','3d');
 expect(await page.evaluate(()=>window.VisitBeloretskYandex.legacy)).toBe(true);await expect(block.locator('.vb-t1__intro h1')).toHaveText('Карта Белорецкого района');await expect(block.locator('.vb-t1__intro')).toBeVisible();
 const app=page.frameLocator('.vb-map-complete iframe').locator('mratkino-map');
 await expect.poll(()=>app.evaluate(e=>!!e.region?.bridge.ready),{timeout:90000}).toBe(true);
 await app.evaluate(e=>{e.$('[data-layer=forest]').checked=false;});
 for(const view of ['stamps','passport','places']){
  await block.locator('#vb-map-modes [data-filter='+view+']').click();
  await expect(block.locator('#vb-map-modes')).toHaveAttribute('data-mode','3d');await expect(block.locator('iframe')).toBeVisible();
  await expect.poll(()=>app.evaluate(e=>e.region.filters.passport?'passport':e.region.filters.stamps?'stamps':'places'),{timeout:30000}).toBe(view);
  await expect.poll(()=>app.evaluate(e=>e.map.getZoom()),{timeout:30000})[view==='places'?'toBeLessThan':'toBeGreaterThan'](12.4);
 }
 const credits=app.locator('.maplibregl-ctrl-attrib');
 await expect(credits).not.toHaveClass(/maplibregl-compact-show/);
 await credits.locator('summary').click();await expect(credits).toHaveClass(/maplibregl-compact-show/);
 await expect(credits.locator('.maplibregl-ctrl-attrib-inner')).toContainText('OpenStreetMap');
 await credits.locator('summary').click();await expect(credits).not.toHaveClass(/maplibregl-compact-show/);
 expect(await page.evaluate(()=>window.oldFilterClicks)).toBe(0);
 await block.getByRole('button',{name:'Карта',exact:true}).click();await block.locator('[data-filter=passport]').click();
 expect(await block.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.getState().view)).toBe('passport');
 await block.getByRole('button',{name:'3D-карта',exact:true}).click();await expect(block.locator('#vb-map-modes')).toHaveAttribute('data-mode','3d');
 await expect.poll(()=>app.evaluate(e=>e.map.getZoom()),{timeout:30000}).toBeGreaterThan(12.4);
 await expect.poll(()=>app.evaluate(e=>e.region.markers.filter(m=>m.p.kind==='stamp-point'&&m.element.style.visibility==='visible').length),{timeout:30000}).toBe(5);
 // A repeated copy of the T123 loader reuses the installed map.
 await page.addScriptTag({url:'http://127.0.0.1:5175/integration/tilda-map-block.js'});await expect(block).toHaveCount(1);await expect(block.locator('iframe')).toHaveCount(1);
 await page.screenshot({path:'renders/tilda-migration-isolated.png',timeout:60000});
 await page.setViewportSize({width:390,height:844});await block.locator('#vb-map-modes select').selectOption('stamps');
 await expect(block.locator('#vb-map-modes')).toHaveAttribute('data-mode','3d');
 await expect.poll(()=>app.evaluate(e=>e.region.filters.passport),{timeout:30000}).toBe(false);
 await expect.poll(()=>app.evaluate(e=>e.region.markers.filter(m=>m.p.kind==='stamp-point'&&m.element.style.visibility==='visible').length),{timeout:30000}).toBe(6);
 await page.screenshot({path:'renders/tilda-migration-mobile.png',timeout:60000});
});
