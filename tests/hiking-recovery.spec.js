import {test,expect} from './tile-fixture.js';
test('failed hiking data can retry; missing nature module preserves the walking route and base map',async({page})=>{
 test.setTimeout(150000);await page.setViewportSize({width:1440,height:1080});await page.emulateMedia({reducedMotion:'reduce'});let fail=true;
 await page.route('**/hiking/malinovaya/routes.geojson',route=>fail?route.fulfill({status:503,body:'test: hiking data unavailable'}):route.continue());
 await page.goto('/?place=malinovaya');const root=page.locator('mratkino-map');await expect(root).toHaveAttribute('data-hiking-state','error',{timeout:60000});await expect(root).toHaveAttribute('data-map-state','ready',{timeout:60000});
 fail=false;await page.getByRole('button',{name:'Повторить загрузку маршрутов'}).click();await expect(root).toHaveAttribute('data-hiking-state','ready',{timeout:60000});await expect(root).toHaveAttribute('data-route','malinovaya/first-return');
 await page.route(/\/nature-scene(?:-[A-Za-z0-9_-]+)?\.js(?:\?|$)/,route=>route.fulfill({status:503,body:'test: nature scene unavailable'}));await page.locator('[data-action=life]').click();await expect(page.locator('.error-note')).toContainText('Детализация не загрузилась',{timeout:30000});await expect(root).toHaveAttribute('data-map-state','ready');
 expect(await root.evaluate(async el=>(await el.map.getSource('hiking-routes').getData()).features.some(f=>f.properties.id==='first-return'))).toBe(true);expect(await root.evaluate(el=>!el.map.getLayer('hiking-nature')&&!el.region.hiking.enabled)).toBe(true);
 await page.locator('.place-select').selectOption('yalangas');await expect(root).toHaveAttribute('data-route','yalangas/a1',{timeout:60000});
});
