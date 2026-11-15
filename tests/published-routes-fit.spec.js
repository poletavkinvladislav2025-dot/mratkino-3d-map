import {test,expect} from './tile-fixture.js';
test('published GPX approaches fit completely beside the card on desktop and above it on mobile',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?routeId=rassypnaya-shushpa&effects=0');const app=page.locator('mratkino-map');await expect(app).toHaveAttribute('data-map-state','ready',{timeout:90000});
 for(const width of [1365,390]){await page.setViewportSize({width,height:900});for(const id of ['rassypnaya-shushpa','iremel-nikolaevka','kumardak-iselgan','kurtashtau-sok']){
  await app.evaluate((h,id)=>h.region.openRoute(id,{focus:true}),id);await expect(app).toHaveAttribute('data-route-fit','ready',{timeout:45000});
  const extent=await app.evaluate(async(h,id)=>{const data=await h.map.getSource('direction-routes').getData(),features=data.features.filter(f=>f.properties.routeId===id),coords=features.flatMap(f=>f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.coordinates.flat()),p=coords.map(c=>h.map.project(c)),card=h.$('.sidebar').getBoundingClientRect(),box=h.map.getContainer().getBoundingClientRect();return {count:coords.length,minX:Math.min(...p.map(p=>p.x)),minY:Math.min(...p.map(p=>p.y)),maxX:Math.max(...p.map(p=>p.x)),maxY:Math.max(...p.map(p=>p.y)),right:innerWidth>760?card.left-box.left:box.width,bottom:innerWidth>760?box.height:card.top-box.top};},id);
  expect(extent.count).toBeGreaterThan(30);expect(extent.minX).toBeGreaterThan(0);expect(extent.minY).toBeGreaterThan(0);expect(extent.maxX).toBeLessThan(extent.right);expect(extent.maxY).toBeLessThan(extent.bottom);
 }}
});
