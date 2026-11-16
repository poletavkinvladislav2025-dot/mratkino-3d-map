import {test,expect} from './tile-fixture.js';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('public/integration/map-catalog.json','utf8'));
async function ordinary(page,width=1365){await page.setViewportSize({width,height:900});await page.route('**/integration/audit-check.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div class="t-rec"><script defer src="tilda-map-block.js"></script></div>'}));await page.goto('/integration/audit-check.html');const h=page.locator('.vb-map-complete');await expect.poll(()=>h.evaluate(e=>!!e.shadowRoot.VisitBeloretskYandex?.getState()),{timeout:60000}).toBe(true);return h;}
for(const width of [1365,390])test('real ordinary map filters the displayed markers and clears the previous card at '+width,async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const h=await ordinary(page,width);
 for(const view of ['places','stamps','passport','places']){await h.evaluate((e,view)=>e.shadowRoot.VisitBeloretskYandex.setFilter(view,{focus:true}),view);const expected=catalog.filter(p=>view==='places'?p.kind!=='stamp-point':p.kind==='stamp-point'&&(view!=='passport'||p.sellsPassports===true));await expect.poll(()=>h.evaluate(e=>[...e.shadowRoot.querySelectorAll('.vb-osm-pm')].filter(m=>m.style.background&&getComputedStyle(m).display!=='none').length),{timeout:5000}).toBe(expected.length);}
 await h.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.openPlace('waterTower'));await expect(h.locator(width>960?'#vbT1Panel':'#vbT1Mcard')).toBeVisible();await expect(h.locator(width>960?'#vbT1Panel':'#vbT1Mcard')).toHaveClass(width>960?/--open/:/--visible/);
 await h.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.setFilter('stamps',{focus:true}));await expect(h.locator('#vbT1Panel')).not.toHaveClass(/--open/);await expect(h.locator('#vbT1Mcard')).not.toHaveClass(/--visible/);
 expect(await h.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.getState().sourceId)).toBeNull();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:'/workspace/artifacts/map-audit-'+width+'.png',timeout:60000});
});
test('3D search, route selection and stamp filters stay synchronized across desktop and phone',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?place=all&effects=0');const h=page.locator('mratkino-map');await expect(h).toHaveAttribute('data-map-state','ready',{timeout:90000});await h.evaluate(e=>{window.auditMap=e.map;e.$('[data-layer=forest]').checked=false;e.region.layers();});
 for(const width of [1365,390]){await page.setViewportSize({width,height:900});await page.getByRole('button',{name:'Поиск мест',exact:true}).click();await page.getByRole('searchbox',{name:'Поиск по названию',exact:true}).fill('Малиновая');await expect.poll(()=>page.locator('.search-results button').count()).toBeGreaterThanOrEqual(3);await page.locator('.search-results button').first().click();await expect.poll(()=>h.evaluate(e=>e.region.cardOpen)).toBe(true);await page.keyboard.press('Escape');await expect.poll(()=>h.evaluate(e=>e.region.cardOpen)).toBe(false);
  await h.evaluate(e=>e.region.openRoute('rassypnaya-shushpa',{focus:true}));await expect(h).toHaveAttribute('data-route-fit','ready',{timeout:90000});await expect.poll(()=>h.evaluate(e=>e.region.routeId)).toBe('rassypnaya-shushpa');
  for(const view of ['stamps','passport','places']){await h.evaluate((e,view)=>e.region.focusView(view),view);const state=await h.evaluate(e=>({id:e.region.id,card:e.region.cardOpen,route:e.region.routeId,same:e.map===window.auditMap,filter:e.region.filters.passport?'passport':e.region.filters.stamps?'stamps':'places'}));expect(state.id).toBe('all');expect(state.card).toBe(false);expect(state.route).toBeFalsy();expect(state.same).toBe(true);expect(state.filter).toBe(view);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errors).toEqual([]);
});
test('ordinary map place markers open their named cards from the keyboard',async({page})=>{
 const h=await ordinary(page);await h.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.setFilter('places',{focus:true}));const marker=h.getByRole('button',{name:'Водонапорная башня Белорецка',exact:true});await marker.focus();await marker.press('Enter');await expect.poll(()=>h.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.getState().sourceId)).toBe('waterTower');await expect(h.locator('#vbT1Panel')).toHaveClass(/--open/);
});
