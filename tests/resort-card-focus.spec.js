import {test,expect} from './tile-fixture.js';
const app=p=>p.locator('mratkino-map');
for(const viewport of [{width:1365,height:900},{width:390,height:844}])test('resort card rows focus their full geometry outside the card at '+viewport.width,async({page})=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?place=all&effects=0');await expect(app(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});await app(page).evaluate(e=>{e.$('[data-layer=forest]').checked=false;e.region.layers();e.map.identity='shared-map';});
 const settled=()=>expect.poll(()=>app(page).evaluate(e=>!e.map.isMoving()&&!e.region.cameraMoving),{timeout:60000}).toBe(true);
 for(const place of ['mratkino','abzakovo','bannoye']){
  await app(page).evaluate(async(e,place)=>{await e.region.choose(place,false,{navigate:false});e.map.jumpTo({center:[58.4099549,53.9680705],zoom:9.3,pitch:0});e.mode2D=false;},place);await settled();
  let selector,route;
  if(place==='mratkino'){selector='.trail-row[data-name="Ю4"]';route='mratkino/trail/south-4';}
  else if(place==='abzakovo'){selector='[data-abz-trail="1"]';route='abzakovo/trail/1';}
  else{route=await app(page).evaluate(e=>e.region.catalog.datasets.bannoye.features.find(f=>f.properties.category==='ski').properties.routeId);selector='[data-catalog-route="'+route+'"]';}
  await page.locator(selector).click();await expect(app(page)).toHaveAttribute('data-route',route);await settled();
  const read=()=>app(page).evaluate((e,place)=>{const m=e.map,features=place==='mratkino'?e.data.trails.features.filter(f=>f.properties.name==='Ю4'):place==='abzakovo'?e.region.ski.data.trails.features.filter(f=>f.properties.number==='1'):e.region.catalog.datasets.bannoye.features.filter(f=>f.properties.routeId===e.region.routeId||e.region.catalog.samePiste(f,e.region.catalog.datasets.bannoye.features.find(f=>f.properties.routeId===e.region.routeId)));const points=[];const walk=a=>{if(typeof a[0]==='number'){const p=m.project(a.slice(0,2));points.push([p.x,p.y]);}else a.forEach(walk);};features.forEach(f=>walk(f.geometry.coordinates));const bounds=e.$('.sidebar').getBoundingClientRect(),canvas=m.getCanvas().getBoundingClientRect();return {zoom:m.getZoom(),center:m.getCenter().toArray(),same:m.identity,width:canvas.width,height:canvas.height,card:{left:bounds.left-canvas.left,top:bounds.top-canvas.top},points};},place);
  const view=await read();expect(view.zoom).toBeGreaterThan(12);expect(view.same).toBe('shared-map');expect(view.points.length).toBeGreaterThan(1);for(const [x,y] of view.points){expect(x,place+' x').toBeGreaterThan(8);expect(y,place+' y').toBeGreaterThan(8);expect(x,place+' right').toBeLessThan(viewport.width>760?view.card.left-5:view.width-8);expect(y,place+' bottom').toBeLessThan(viewport.width>760?view.height-8:view.card.top-5);}
  // Selecting the same row again must not accumulate camera padding or change the fit.
  await page.locator(selector).click();await settled();const again=await read();expect(again.zoom).toBeCloseTo(view.zoom,2);expect(again.center[0]).toBeCloseTo(view.center[0],4);expect(again.center[1]).toBeCloseTo(view.center[1],4);
 }
 if(viewport.width>760){
  await app(page).evaluate(e=>e.region.choose('mratkino',false,{navigate:false}));await page.locator('.lift-list .lift-row').first().click();await settled();expect(await app(page).evaluate(e=>e.map.getZoom())).toBeGreaterThan(12);
  await app(page).evaluate(e=>e.region.choose('abzakovo',false,{navigate:false}));await page.locator('.ski-area-panel details>summary').click();await page.locator('[data-abz-lift]').first().click();await settled();expect(await app(page).evaluate(e=>e.map.getCenter().lng)).toBeGreaterThan(58.59);
 }
 expect(errors).toEqual([]);
});
