import {test,expect,relayTiles} from './tile-fixture.js';
const app=p=>p.locator('mratkino-map');
test('thin routes reveal names only on click, with no bottom strip on desktop or mobile',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?place=all&effects=0');await expect(app(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});
 for(const [id,name,viewport] of [['gut','Большая Уральская тропа',{width:1365,height:900}],['yt','Южноуральская тропа',{width:390,height:844}]]){
  await page.setViewportSize(viewport);await app(page).evaluate(e=>{e.map.identity='same-map';e.map.jumpTo({center:[58.6,54.2],zoom:9,pitch:0,bearing:0});});
  const locate=()=>app(page).evaluate((e,id)=>{const m=e.map,w=m.getContainer().clientWidth,h=m.getContainer().clientHeight,layer='long-distance-'+id+'-line';if(!m.isSourceLoaded('long-distance-'+id))return null;for(const f of m.queryRenderedFeatures({layers:[layer]}))for(const c of (f.geometry.type==='MultiLineString'?f.geometry.coordinates.flat():f.geometry.coordinates)){const p=m.project(c.slice(0,2));if(p.x<50||p.y<80||p.x>w-60||p.y>h-90)continue;const hits=m.queryRenderedFeatures([[p.x-2,p.y-2],[p.x+2,p.y+2]],{layers:[layer]});if(hits.length)return {x:p.x,y:p.y};}return null;},id);
  await expect.poll(locate,{timeout:60000}).not.toBeNull();const p=await locate(),box=await page.locator('.maplibregl-canvas').boundingBox();await expect(page.locator('.route-name-popup')).toHaveCount(0);await page.mouse.click(box.x+p.x,box.y+p.y);await expect(page.locator('.long-route-popup')).toContainText(name);const section=page.locator('.long-route-popup section').filter({has:page.getByRole('heading',{name,exact:true})});await expect(section.locator('p')).not.toBeEmpty();await expect(section.getByRole('link',{name:'Сайт тропы ↗'})).toHaveAttribute('href',id==='gut'?'https://www.greaturaltrail.ru/':'https://suraltrail.ru/');await expect(section.getByRole('link')).toHaveAttribute('target','_blank');await expect(page.locator('.legend')).toBeHidden();
  if(viewport.width<760){const popup=await page.locator('.route-name-popup').boundingBox(),map=await page.locator('.maplibregl-canvas').boundingBox();expect(popup.x).toBeGreaterThanOrEqual(map.x+11);expect(popup.x+popup.width).toBeLessThanOrEqual(map.x+map.width-11);expect(popup.y).toBeGreaterThanOrEqual(map.y);expect(popup.y+popup.height).toBeLessThanOrEqual(map.y+map.height);await expect(page.locator('.maplibregl-popup-tip')).toBeHidden();const close=await page.locator('.maplibregl-popup-close-button').boundingBox();expect(close.width).toBeGreaterThanOrEqual(44);expect(close.height).toBeGreaterThanOrEqual(44);}
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

test('embedded mobile map pans with one finger and still supports pinch zoom',async({browser})=>{
 test.setTimeout(180000);const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 try{const page=await context.newPage();await relayTiles(page);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/integration/unified-demo.html');
 const embedded=page.frameLocator('iframe').locator('mratkino-map');await expect(embedded).toHaveAttribute('data-map-state','ready',{timeout:90000});await embedded.evaluate(e=>{e.map.jumpTo({center:[58.6,54.2],zoom:9,pitch:0,bearing:0});});
 const rect=await page.frameLocator('iframe').locator('.map canvas').boundingBox(),cdp=await context.newCDPSession(page),x=rect.x+rect.width*.5,y=rect.y+rect.height*.45;
 const gesture=async pinch=>{const points=n=>pinch?[{x:x-25-n*8,y,id:1},{x:x+25+n*8,y,id:2}]:[{x:x+n*8,y:y+n*3,id:1}];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(0)});for(let n=1;n<=6;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(n)});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>embedded.evaluate(e=>!e.map.isMoving()),{timeout:30000}).toBe(true);};
 const before=await embedded.evaluate(e=>e.map.getCenter().toArray());await gesture(false);expect(await embedded.evaluate((e,c)=>Math.hypot(...e.map.getCenter().toArray().map((v,i)=>v-c[i])),before)).toBeGreaterThan(.00001);
 const zoom=await embedded.evaluate(e=>e.map.getZoom());await gesture(true);expect(await embedded.evaluate(e=>e.map.getZoom())).toBeGreaterThan(zoom+.2);
 }finally{await context.close();}
});
