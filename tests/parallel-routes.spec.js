import {test,expect} from './tile-fixture.js';
test('Malinovaya keeps four selectable routes and renders shared stretches in parallel on desktop and phone',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?place=malinovaya&effects=0');const app=page.locator('mratkino-map');await expect(app).toHaveAttribute('data-hiking-state','ready',{timeout:90000});await expect(app).toHaveAttribute('data-map-state','ready',{timeout:90000});
 await app.evaluate(e=>{e.map.testIdentity='same';e.$('[data-layer=forest]').checked=false;e.region.layers();e.map.jumpTo({center:[58.331,53.991],zoom:14.5,pitch:0,bearing:0});});
 for(const [width,height] of [[1365,900],[390,844]]){await page.setViewportSize({width,height});
  for(const id of ['first-return','third','three-peaks','three-peaks-return']){await page.locator(`.hiking-options [data-route="${id}"]`).click();await expect(app).toHaveAttribute('data-route','malinovaya/'+id);expect(await app.evaluate(e=>e.map.testIdentity)).toBe('same');}
  const state=await app.evaluate(async e=>{const source=await e.map.getSource('hiking-routes').getData(),route=e.region.hiking.route;return {ids:[...new Set(source.features.filter(f=>f.properties.area==='malinovaya').map(f=>f.properties.id))],shared:source.features.filter(f=>f.properties.overlapCount>=3&&f.properties.renderOffset!==0).length,closed:JSON.stringify(route.geometry.coordinates[0])===JSON.stringify(route.geometry.coordinates.at(-1)),stopKeys:e.region.hiking.data.features.filter(f=>f.properties.routeId==='three-peaks-return'&&f.geometry.type==='Point').map(f=>f.properties.key)};});
  expect(state.ids.sort()).toEqual(['first-return','third','three-peaks','three-peaks-return']);expect(state.shared).toBeGreaterThan(0);expect(state.closed).toBe(true);expect(state.stopKeys).toEqual(['bel','first','second','third','bel']);
  await expect.poll(()=>app.evaluate(e=>[...new Set(e.map.queryRenderedFeatures({layers:['hiking-route-line']}).filter(f=>f.properties.overlapCount>=3).map(f=>f.properties.id))].length),{timeout:30000}).toBeGreaterThanOrEqual(3);
  await page.screenshot({path:`/tmp/malinovaya-parallel-${width}.png`,timeout:60000});
 }
 expect(errors).toEqual([]);
});
