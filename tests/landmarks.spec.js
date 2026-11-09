import {test,expect} from './tile-fixture.js';
for(const width of [1365,375])test('photo-based moose family and mapped second/third Malinovaya cliffs '+width,async({page})=>{
 test.setTimeout(240000);await page.setViewportSize({width,height:width===375?812:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?place=moose');const app=page.locator('mratkino-map');await expect(app).toHaveAttribute('data-map-state','ready',{timeout:60000});
 for(const id of ['moose','malinovaya-2','malinovaya-3']){
  if(id!=='moose')await app.evaluate((h,id)=>h.region.choose(id,false),id);
  await expect(app).toHaveAttribute('data-landmark-'+id,'ready',{timeout:90000});
  const stats=await app.evaluate((h,id)=>{const m=h.region.landscape.scene.landmarks.get(id).model;return {animals:m.animals?.length,columns:m.columns?.length,center:h.region.id,meshes:m.group.children.length};},id);
  expect(stats.center).toBe(id);if(id==='moose')expect(stats.animals).toBe(3);else expect(stats.columns).toBeGreaterThan(15);
  await page.screenshot({path:'/tmp/landmark-'+id+'-'+width+'.png'});
 }
 await app.evaluate(h=>{h.region.setFilters({interesting:false});});await expect(app).toHaveAttribute('data-landmark-malinovaya-3','hidden');expect(errors).toEqual([]);
});
