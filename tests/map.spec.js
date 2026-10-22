import { test, expect } from '@playwright/test';

const root=page=>page.locator('mratkino-map');
async function ready(page){await page.goto('/');await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:45000});await page.waitForFunction(()=>{const el=document.querySelector('mratkino-map');return el.map&&!el.map.isMoving()&&el.map.areTilesLoaded();});}
async function settled(page){await page.waitForFunction(()=>!document.querySelector('mratkino-map').map.isMoving());}
const read=(page,fn)=>root(page).evaluate(fn);

test('actual WebGL terrain, real trails and data provenance',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1050});await ready(page);
 expect(await read(page,el=>el.map.getTerrain().exaggeration)).toBe(1);
 const height=await read(page,el=>el.map.queryTerrainElevation([58.4371909,53.9974603]));expect(height).toBeGreaterThan(750);expect(height).toBeLessThan(850);
 expect(await read(page,el=>el.map.queryRenderedFeatures({layers:['trail-line']}).length)).toBeGreaterThan(0);
 await expect(page.locator('.route-label')).toHaveCount(7);await expect(page.locator('.trail-row')).toHaveCount(5);
 await expect(page.locator('.data-summary')).toContainText('7 названных трасс OSM');
 const route=await read(page,el=>el.data.trails.features.find(f=>f.properties.name==='Ю3'));expect(route.properties.ref).toBe('Ю2');expect(route.properties.warnings.length).toBe(1);
 expect(await read(page,el=>el.data.manifest.missing_trails)).toEqual(['Ю5']);
 await page.screenshot({path:'renders/live-south.png',fullPage:true});
 await page.getByRole('button',{name:'Общий вид',exact:true}).click();await settled(page);await page.screenshot({path:'renders/live-overview.png',fullPage:true});expect(errors).toEqual([]);
});

test('one map changes camera between slopes, can rotate, pitch, zoom and interrupt animation',async({page})=>{
 await ready(page);const south=await read(page,el=>el.map.getBearing());
 await read(page,el=>{el.map.__identity='same-map';});
 await page.getByRole('button',{name:'Северный склон',exact:true}).click();await settled(page);
 const north=await read(page,el=>el.map.getBearing());const delta=Math.abs(((north-south+540)%360)-180);expect(delta).toBeGreaterThan(100);
 expect(await read(page,el=>el.map.__identity)).toBe('same-map');await expect(page.locator('.trail-row')).toHaveCount(3);
 await page.screenshot({path:'renders/live-north.png',fullPage:true});
 await page.getByRole('button',{name:'Южный склон',exact:true}).click();
 await page.waitForTimeout(160);const canvas=page.locator('canvas');const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.6);await page.mouse.down({button:'right'});await page.waitForTimeout(100);
 expect(await read(page,el=>el.map.isMoving())).toBe(false);
 await page.mouse.move(box.x+box.width*.5+100,box.y+box.height*.6+40,{steps:8});await page.mouse.up({button:'right'});await settled(page);
 const rotated=await read(page,el=>el.map.getBearing());expect(Math.abs(rotated-north)).toBeGreaterThan(5);
 await canvas.focus();const pitch=await read(page,el=>el.map.getPitch());await page.keyboard.press('Shift+ArrowDown');await settled(page);expect(await read(page,el=>el.map.getPitch())).toBeLessThan(pitch);
 const zoom=await read(page,el=>el.map.getZoom());await page.locator('.maplibregl-ctrl-zoom-in').click();await settled(page);expect(await read(page,el=>el.map.getZoom())).toBeGreaterThan(zoom);
 await page.locator('[data-action=mode]').click();await settled(page);expect(await read(page,el=>el.map.getPitch())).toBe(0);
 await page.locator('[data-action=mode]').click();await settled(page);expect(await read(page,el=>el.map.getPitch())).toBeGreaterThan(50);
});

test('select real routes, expose conflicts and missing geometry; layer controls work',async({page})=>{
 await ready(page);await page.locator('.trail-row[data-name="Ю3"]').click();await expect(page.locator('.card')).toContainText('ref OSM');await expect(page.locator('.card')).toContainText('Требует уточнения');
 await expect(page.locator('.card a')).toHaveAttribute('href','https://www.openstreetmap.org/way/61960627');
 expect(await read(page,el=>el.map.getPaintProperty('trail-line','line-width'))).toContainEqual(['==',['get','id'],'way/61960627']);
 await page.getByRole('button',{name:'Показать трассу',exact:true}).click();await settled(page);
 await page.locator('.trail-row[data-name="Ю5"]').click();await expect(page.locator('.card')).toContainText('ГЕОМЕТРИЯ НЕ ПОЛУЧЕНА');
 for(const [name,id] of [['lifts','lift-line'],['contours','contours'],['facilities','facility-buildings'],['forest','forest']]){
  const toggle=page.locator(`[data-layer=${name}]`);const was=await toggle.isChecked();await toggle.setChecked(!was);
  expect(await root(page).evaluate((el,id)=>el.map.getLayoutProperty(id,'visibility'),id)).toBe(was?'none':'visible');
 }
 await page.getByRole('button',{name:'ⓘ О данных',exact:true}).click();await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
});

test('mobile starts with map visible, sheet collapses, controls do not overlap, no overflow',async({browser})=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:5175',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 try{
 const page=await context.newPage();await ready(page);
 const rect=await page.locator('.map-wrap').boundingBox();expect(rect.y).toBeLessThan(190);expect(rect.height).toBeGreaterThan(370);
 await expect(page.locator('.panel-body')).not.toBeVisible();await page.locator('.mobile-panel-toggle').click();await expect(page.locator('.panel-body')).toBeVisible();await page.locator('.trail-row[data-name="Ю1"]').click();await expect(page.locator('.card')).toContainText('Ю1');
 await page.locator('.mobile-panel-toggle').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.maplibregl-ctrl-fullscreen')).toHaveCount(1);await expect(page.locator('.maplibregl-ctrl-zoom-in')).toHaveCount(1);
 const a=await page.locator('.maplibregl-ctrl-fullscreen').boundingBox();const b=await page.locator('[data-action=mode]').boundingBox();expect(a.y+a.height).toBeLessThanOrEqual(b.y);
 await page.screenshot({path:'renders/live-mobile.png',fullPage:true});
 const cdp=await context.newCDPSession(page);
 const box=await page.locator('canvas').boundingBox();const cx=box.x+box.width*.45,cy=box.y+box.height*.4;
 const bearing=await read(page,el=>el.map.getBearing());
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-55,y:cy,id:1},{x:cx+55,y:cy,id:2}]});
 for(let i=1;i<=12;i++){const a=i*Math.PI/36;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-55*Math.cos(a),y:cy-55*Math.sin(a),id:1},{x:cx+55*Math.cos(a),y:cy+55*Math.sin(a),id:2}]});await page.waitForTimeout(40);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled(page);
 expect(Math.abs(await read(page,el=>el.map.getBearing())-bearing)).toBeGreaterThan(10);
 // Model an adjoining Tilda block and verify one-finger gestures scroll the page.
 await page.evaluate(()=>{const spacer=document.createElement('div');spacer.style.height='500px';document.body.append(spacer);});
 const center=await read(page,el=>el.map.getCenter().toArray());
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy+50,id:1}]});
 for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx,y:cy+50-i*25,id:1}]});await page.waitForTimeout(40);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(20);
 expect(await read(page,el=>el.map.getCenter().toArray())).toEqual(center);
 }finally{await context.close();}
});

test('no WebGL shows explicit fallback and retry restores live terrain',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;window.__restoreContext=()=>{HTMLCanvasElement.prototype.getContext=original;};HTMLCanvasElement.prototype.getContext=function(type,...rest){return /^webgl/.test(type)?null:original.call(this,type,...rest);};});
 await page.goto('/');await expect(root(page)).toHaveAttribute('data-map-state','fallback');await expect(page.locator('.fallback')).toBeVisible();await expect(page.locator('.fallback p')).toContainText('3D');
 await page.evaluate(()=>window.__restoreContext());await page.getByRole('button',{name:'Повторить загрузку 3D-карты',exact:true}).click();await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:45000});await expect(page.locator('.fallback')).toBeHidden();
});

test('missing terrain tiles do not produce a blank or falsely ready map',async({page})=>{
 await page.route('**/live/dem/**/*.png',route=>route.fulfill({status:503,body:'unavailable'}));
 await page.goto('/');await expect(root(page)).toHaveAttribute('data-map-state','fallback',{timeout:45000});await expect(page.locator('.fallback p')).toContainText('недоступна');await expect(page.locator('.fallback img')).toBeVisible();
});

test('component can reconnect without duplicate maps or page-wide CSS leaks',async({page})=>{
 await ready(page);await page.evaluate(()=>{const el=document.querySelector('mratkino-map');el.remove();document.querySelector('#app').append(el);});await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:45000});await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('.maplibregl-ctrl-zoom-in')).toHaveCount(1);
 await page.evaluate(()=>{const p=document.createElement('p');p.id='external';p.textContent='Tilda content';p.style.fontSize='27px';document.body.append(p);});expect(await page.locator('#external').evaluate(el=>getComputedStyle(el).fontSize)).toBe('27px');
});
