import {test,expect} from './tile-fixture.js';
test('missing optional scene chunk leaves base map usable and offers an explicit reload',async({page})=>{
 test.setTimeout(150000);await page.emulateMedia({reducedMotion:'reduce'});await page.route(/\/resort-scene(?:-[A-Za-z0-9_-]+)?\.js(?:\?|$)/,route=>route.fulfill({status:503,body:'test: optional scene module unavailable'}));
 await page.goto('/?place=mratkino');await expect(page.locator('mratkino-map')).toHaveAttribute('data-map-state','ready',{timeout:60000});
 await page.locator('[data-action=life]').click();await expect(page.locator('.error-note')).toContainText('Объёмная сцена не загрузилась',{timeout:30000});
 await expect(page.locator('mratkino-map')).toHaveAttribute('data-map-state','ready');expect(await page.locator('mratkino-map').evaluate(el=>el.lifeScene===null)).toBe(true);
 // A Vite production build emits its preloadError event; development uses a native import error.
 if(process.env.TEST_PRODUCTION)await expect(page.getByRole('button',{name:'Загрузить свежую версию'})).toBeVisible();
 const before=await page.locator('mratkino-map').evaluate(el=>el.map.getZoom());await page.locator('.maplibregl-ctrl-zoom-in').click();await expect.poll(()=>page.locator('mratkino-map').evaluate(el=>el.map.getZoom())).toBeGreaterThan(before+.3);
});

test('missing local resort data preserves regional map and city navigation without retry loop',async({page})=>{
 test.setTimeout(150000);await page.emulateMedia({reducedMotion:'reduce'});let failures=0;
 await page.route('**/live/trails.geojson',route=>{failures++;return route.fulfill({status:503,body:'test: local piste data unavailable'});});
 await page.goto('/?place=mratkino');await expect(page.locator('mratkino-map')).toHaveAttribute('data-map-state','ready',{timeout:60000});await expect(page.locator('.error-note')).toContainText('Общая карта доступна');
 await page.locator('.place-select').selectOption('beloretsk');await expect(page.locator('mratkino-map')).toHaveAttribute('data-place','beloretsk');
 await expect.poll(()=>page.locator('mratkino-map').evaluate(el=>el.map.getPitch())).toBeLessThan(10);expect(failures).toBeLessThanOrEqual(3);
});
