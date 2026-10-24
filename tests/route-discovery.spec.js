import {test,expect} from './tile-fixture.js';
const app=p=>p.locator('mratkino-map');
test('thin routes reveal names only on click, with no bottom strip on desktop or mobile',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?place=all&effects=0');await expect(app(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});
 for(const [id,name,viewport] of [['gut','Большая Уральская тропа',{width:1365,height:900}],['yt','Маршрут YT_v2-8',{width:390,height:844}]]){
  await page.setViewportSize(viewport);await app(page).evaluate(e=>{e.map.identity='same-map';e.map.jumpTo({center:[58.6,54.2],zoom:9,pitch:0,bearing:0});});
  const locate=()=>app(page).evaluate((e,id)=>{const m=e.map,w=m.getContainer().clientWidth,h=m.getContainer().clientHeight,layer='long-distance-'+id+'-line';if(!m.isSourceLoaded('long-distance-'+id))return null;for(const f of m.queryRenderedFeatures({layers:[layer]}))for(const c of (f.geometry.type==='MultiLineString'?f.geometry.coordinates.flat():f.geometry.coordinates)){const p=m.project(c.slice(0,2));if(p.x<50||p.y<80||p.x>w-60||p.y>h-90)continue;const hits=m.queryRenderedFeatures([[p.x-2,p.y-2],[p.x+2,p.y+2]],{layers:[layer]});if(hits.length)return {x:p.x,y:p.y};}return null;},id);
  await expect.poll(locate,{timeout:60000}).not.toBeNull();const p=await locate(),box=await page.locator('.maplibregl-canvas').boundingBox();await expect(page.locator('.route-name-popup')).toHaveCount(0);await page.mouse.click(box.x+p.x,box.y+p.y);await expect(page.locator('.long-route-popup')).toContainText(name);await expect(page.locator('.legend')).toBeHidden();
  // A stationary sync must not dismiss the name; hiding that route must dismiss it.
  await app(page).evaluate(e=>e.region.longDistance.sync());await expect(page.locator('.long-route-popup')).toContainText(name);await app(page).evaluate((e,id)=>{e.region.longDistance.visible[id]=false;e.region.longDistance.sync();},id);await expect(page.locator('.route-name-popup')).toHaveCount(0);await app(page).evaluate(e=>{e.region.longDistance.visible.gut=true;e.region.longDistance.sync();});expect(await app(page).evaluate(e=>e.map.identity)).toBe('same-map');
 }
 expect(errors).toEqual([]);
});
test('approaching either resort automatically reveals pistes and then close-up route labels',async({page})=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1365,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?place=all&effects=0');await expect(app(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});
 for(const [id,center,layer,labels] of [['mratkino',[58.444,53.997],'trail-line','.route-label'],['abzakovo',[58.628,53.802],'abzakovo-trail-line','.abz-label']]){
  // Pan/zoom the existing overview, without selecting a resort or opening a card.
  await app(page).evaluate((e,center)=>{e.$('[data-layer=forest]').checked=false;e.region.layers();e.map.jumpTo({center,zoom:12,pitch:0,bearing:0});},center);
  await expect.poll(()=>app(page).evaluate((e,id)=>id==='mratkino'?e.resortActive:e.region.ski.active,id),{timeout:60000}).toBe(true);expect(await app(page).evaluate((e,layer)=>e.map.getLayoutProperty(layer,'visibility'),layer)).toBe('visible');
  await expect.poll(()=>page.locator(labels).evaluateAll(es=>es.filter(e=>getComputedStyle(e).visibility==='visible').length)).toBe(0);
  await app(page).evaluate((e,center)=>e.map.jumpTo({center,zoom:14.7,pitch:0}),center);await expect.poll(()=>page.locator(labels).evaluateAll(es=>es.filter(e=>getComputedStyle(e).visibility==='visible').length),{timeout:60000}).toBeGreaterThan(0);await expect(page.locator('.sidebar')).toBeHidden();await expect(page.locator('.legend')).toBeHidden();
  await app(page).evaluate(e=>{e.$('[data-layer=labels]').checked=false;e.region.layers();});await expect.poll(()=>page.locator(labels).evaluateAll(es=>es.filter(e=>getComputedStyle(e).visibility==='visible').length)).toBe(0);await app(page).evaluate(e=>{e.$('[data-layer=labels]').checked=true;e.region.layers();});
  const label=page.locator(labels).filter({visible:true}).first();await label.click();await expect(page.locator('.sidebar')).toBeVisible();await expect(app(page)).toHaveAttribute('data-place',id);await page.getByRole('button',{name:'Закрыть карточку',exact:true}).click();
 }
 expect(errors).toEqual([]);
});
