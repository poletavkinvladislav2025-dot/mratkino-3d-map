import {test,expect} from './tile-fixture.js';
import {fakeYandex} from './fixtures/fake-yandex.js';
test('one T123 opens a page route, draws ordinary geometry and preserves selection across both engines',async({page})=>{
 test.setTimeout(240000);await page.addInitScript(fakeYandex);await page.emulateMedia({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/integration/common-test.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div class="t-rec"><script src="tilda-map-block.js" data-place="yalangas" data-route="yalangas/a1" defer></script></div>'}));await page.goto('/integration/common-test.html');const block=page.locator('.vb-map-complete'),picker=block.getByRole('combobox',{name:'Выбрать маршрут'});
 await expect(block.locator('#vb-map-modes')).toHaveAttribute('data-mode','yandex');await expect(picker).toHaveValue('yalangas/a1');await expect(block.locator('.vb-route-detail')).toContainText('От старта А1');
 await expect.poll(()=>page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.getState().routeId),{timeout:30000}).toBe('yalangas/a1');await expect.poll(()=>page.evaluate(()=>window.yandexLines.length),{timeout:30000}).toBeGreaterThan(0);await expect(block.locator('iframe')).not.toHaveAttribute('src',/.+/);
 await picker.selectOption('yalangas/a2');await expect.poll(()=>page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.getState().routeId)).toBe('yalangas/a2');
 await block.getByRole('button',{name:'3D-карта',exact:true}).click();const app=page.frameLocator('iframe').locator('mratkino-map');await expect.poll(()=>app.evaluate(e=>e.region?.routeId),{timeout:90000}).toBe('yalangas/a2');await expect(block.locator('.vb-route-detail')).toBeHidden();
 await app.evaluate(e=>e.region.openRoute('malinovaya/three-peaks-return',{focus:true}));await expect(picker).toHaveValue('malinovaya/three-peaks-return');await block.getByRole('button',{name:'Карта',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.getState().routeId),{timeout:30000}).toBe('malinovaya/three-peaks-return');await expect(block.locator('.vb-route-detail')).toContainText('Три вершины');
 await block.locator('#vb-map-modes [data-filter=stamps]').click();await expect(picker).toBeHidden();await expect(block.locator('.vb-route-detail')).toBeHidden();await expect.poll(()=>page.evaluate(()=>window.yandexLines.length)).toBe(0);
 await block.locator('#vb-map-modes [data-filter=passport]').click();expect(await page.evaluate(()=>window.yandexMarkers.filter(m=>m.values.visible).length)).toBe(5);
 await block.locator('#vb-map-modes [data-filter=places]').click();await page.setViewportSize({width:390,height:844});await picker.selectOption('yalangas/a1');await expect(block.locator('.vb-route-detail')).toBeVisible();const card=await block.locator('.vb-route-detail').boundingBox(),map=await block.locator('.vb-t1__map').boundingBox();expect(card.x).toBeGreaterThanOrEqual(map.x);expect(card.x+card.width).toBeLessThanOrEqual(map.x+map.width);expect(card.y+card.height).toBeLessThanOrEqual(map.y+map.height);await page.screenshot({path:'/tmp/common-map-mobile.png'});
 for(const id of ['zavyaliha','sunny-valley']){
  await block.getByRole('combobox',{name:'Выбрать место',exact:true}).selectOption(id);
  await expect.poll(()=>block.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.getState().sourceId)).toBe(id);
  await expect.poll(()=>picker.locator('option').count()).toBeGreaterThan(6);
  const route=await block.evaluate((e,id)=>e.shadowRoot.VisitBeloretskYandex.getRoutes().then(routes=>routes.find(r=>r.placeId===id&&r.category==='ski').id),id);await picker.selectOption(route);
  await block.getByRole('button',{name:'3D-карта',exact:true}).click();await expect.poll(()=>app.evaluate(e=>e.region?.routeId),{timeout:90000}).toBe(route);expect(await app.evaluate(e=>e.region.id)).toBe(id);
  await expect.poll(()=>app.evaluate(async(e,id)=>(await e.map.getSource('winter-catalog').getData()).features.filter(f=>f.properties.placeId===id).length,id),{timeout:30000}).toBeGreaterThan(0);
  await block.getByRole('button',{name:'Карта',exact:true}).click();await expect.poll(()=>block.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.getState().routeId)).toBe(route);
 }
 expect(await block.evaluate(e=>{const a=e.shadowRoot.VisitBeloretskYandex,pending=a.openRoute('malinovaya/third');a.setFilter('passport',{focus:true});return pending;})).toBe(false);await expect.poll(()=>block.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.getState().view)).toBe('passport');
 expect(errors).toEqual([]);
});
