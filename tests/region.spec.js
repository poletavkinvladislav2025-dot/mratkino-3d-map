import {test,expect} from './tile-fixture.js';
const root=page=>page.locator('mratkino-map');
const read=(page,fn)=>root(page).evaluate(fn);
async function ready(page,place){await page.goto('/?place='+place);await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:60000});await page.waitForFunction(()=>{const m=document.querySelector('mratkino-map').map;return m&&!m.isMoving()&&m.areTilesLoaded()},{},{timeout:60000});}

test('regional overview loads no resort bundles/data, one map flies to city and mountains, no urban labels',async({page})=>{
 test.setTimeout(240000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.setViewportSize({width:1440,height:1080});await ready(page,'all');
 expect(await page.locator('.place-select option').count()).toBe(24);expect(requests.some(u=>/forest-instances|resort-scene|live\/trails|live\/facilities/.test(u))).toBe(false);
 await read(page,el=>{el.map.identity='regional-map';});
 expect(await read(page,el=>el.map.getTerrain().exaggeration)).toBe(1);
 await page.screenshot({path:'renders/region-overview.png',fullPage:true});
 await page.locator('.place-select').selectOption('beloretsk');await expect(root(page)).toHaveAttribute('data-place','beloretsk');await page.waitForFunction(()=>!document.querySelector('mratkino-map').map.isMoving());
 expect(await read(page,el=>el.map.getPitch())).toBeLessThan(10);expect(await read(page,el=>el.map.getStyle().layers.some(l=>l.type==='symbol'||l.type==='fill-extrusion'))).toBe(false);
 await page.waitForFunction(()=>document.querySelector('mratkino-map').map.areTilesLoaded(),{},{timeout:60000});
 const roads=await read(page,el=>el.map.queryRenderedFeatures({layers:['region-roads']}).length);expect(roads).toBeGreaterThan(10);await page.screenshot({path:'renders/beloretsk-overhead.png',fullPage:true});
 await page.locator('.place-select').selectOption('yalangas');await page.waitForFunction(()=>!document.querySelector('mratkino-map').map.isMoving());expect(await read(page,el=>el.map.identity)).toBe('regional-map');
 await page.waitForFunction(()=>document.querySelector('mratkino-map').map.areTilesLoaded(),{},{timeout:60000});const height=await read(page,el=>el.map.queryTerrainElevation([58.31852,54.1278441]));expect(height).toBeGreaterThan(1200);expect(height).toBeLessThan(1350);
 await page.screenshot({path:'renders/yalangas-terrain.png',fullPage:true});
 await page.locator('[data-layer=labels]').uncheck();expect(await read(page,el=>el.region.markers.every(m=>m.element.style.visibility==='hidden'))).toBe(true);
 expect(errors).toEqual([]);
});

test('desktop wheel without Ctrl changes zoom around cursor and GPX imports without upload',async({page})=>{
 test.setTimeout(180000);await ready(page,'beloretsk');
 const box=await page.locator('.map').boundingBox(),x=box.x+box.width*.6,y=box.y+box.height*.5;
 const before=await read(page,el=>({zoom:el.map.getZoom(),point:el.map.unproject([el.map.getContainer().clientWidth*.6,el.map.getContainer().clientHeight*.5]).toArray()}));
 await page.mouse.move(x,y);await page.mouse.wheel(0,-220);await expect.poll(()=>read(page,el=>el.map.getZoom())).toBeGreaterThan(before.zoom+.1);
 await page.waitForFunction(()=>!document.querySelector('mratkino-map').map.isMoving());
 expect(await read(page,el=>el.resortActive)).toBe(false);
 const after=await read(page,el=>el.map.unproject([el.map.getContainer().clientWidth*.6,el.map.getContainer().clientHeight*.5]).toArray());expect(Math.abs(after[0]-before.point[0])).toBeLessThan(.002);
 await page.locator('input[type=file]').setInputFiles({name:'sample.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from('<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Тест импорта, не туристический маршрут</name><trkseg><trkpt lat="53.96" lon="58.40"><ele>530</ele></trkpt><trkpt lat="53.961" lon="58.401"><ele>540</ele></trkpt></trkseg></trk><wpt lat="53.9605" lon="58.4005"><name>Остановка</name></wpt></gpx>')});
 await expect(page.locator('.route-card')).toContainText('Тест импорта');await expect(page.locator('.route-card')).toContainText('10 м');expect(await read(page,el=>el.region.routeData.features.length)).toBe(2);
 await page.getByRole('button',{name:'Убрать трек'}).click();await expect(page.locator('.route-card')).toBeEmpty();
});

test('mobile page scroll stays available, two-finger navigation enabled, layout fits',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
 await page.route(/^https:\/\/tiles\.(mapterhorn|openfreemap)\.(com|org)\//,async route=>{const response=await route.fetch({url:'http://127.0.0.1:4399/?url='+encodeURIComponent(route.request().url()),timeout:60000});await route.fulfill({response});});
 await ready(page,'beloretsk');expect(await read(page,el=>el.map.cooperativeGestures.isEnabled())).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.mobile-panel-toggle').click();await expect(page.locator('.region-panel')).toBeVisible();await page.screenshot({path:'renders/region-mobile.png',fullPage:true});await page.unrouteAll({behavior:'ignoreErrors'});await context.close();
});
