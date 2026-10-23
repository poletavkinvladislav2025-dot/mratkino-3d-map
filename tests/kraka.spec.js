import {test,expect} from './tile-fixture.js';
const app=page=>page.locator('mratkino-map');
test('Kraka keeps exact A and B, optional original BUT track and filters without a fabricated A-B path',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1365,height:900});await page.goto('/?place=bolshoy-kraka&effects=0');await expect(app(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});
 await expect(page.locator('.kraka-anchor')).toHaveCount(2);await expect(page.locator('.region-panel')).toContainText('53.807985, 58.195555');await expect(page.locator('.region-panel')).toContainText('53.818296, 58.141468');
 expect(await app(page).evaluate(e=>e.region.kraka.markers.map(p=>p.marker.getLngLat().toArray()))).toEqual([[58.195555,53.807985],[58.141468,53.818296]]);
 expect(await app(page).evaluate(async e=>(await e.map.getSource('kraka-but').getData()).features.length)).toBe(0);
 await page.getByRole('checkbox',{name:'Показать протяжённый трек БЮТ'}).check();await expect.poll(()=>app(page).evaluate(e=>e.region.kraka.data?.features[0].geometry.coordinates.length||0)).toBeGreaterThan(400);
 expect(await app(page).evaluate(e=>e.region.kraka.data.features[0].geometry.coordinates.at(-1))).toEqual([58.039363,53.60574]);
 await page.getByRole('checkbox',{name:'Показать протяжённый трек БЮТ'}).uncheck();await expect.poll(()=>app(page).evaluate(e=>e.map.getLayoutProperty('kraka-but-line','visibility'))).toBe('none');
 await app(page).evaluate(e=>{e.region.kraka.fit(false,false);e.region.setFilters({hiking:false});});await expect(page.locator('.kraka-anchor').first()).toBeHidden();await app(page).evaluate(e=>e.region.setFilters({hiking:true}));await expect(page.locator('.kraka-anchor').first()).toBeVisible();
 await page.waitForFunction(()=>document.querySelector('mratkino-map').map.areTilesLoaded(),null,{timeout:90000});await page.screenshot({path:'renders/unified-kraka.png'});expect(errors).toEqual([]);
});
test('one map restores real building volume on activation, keeps it at city and resorts, allows right-drag to 85 degrees',async({page})=>{
 test.setTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1365,height:900});await page.goto('/?place=beloretsk&effects=0&card=0');await expect(app(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});
 await app(page).evaluate(e=>{e.$('[data-layer=forest]').checked=false;e.region.layers();});expect(await app(page).evaluate(e=>e.map.getLayoutProperty('region-buildings-3d','visibility'))).toBe('none');await page.locator('[data-action=life]').click();await expect.poll(()=>app(page).evaluate(e=>e.map.getPitch()),{timeout:60000}).toBeCloseTo(58);expect(await app(page).evaluate(e=>e.map.getZoom())).toBeGreaterThanOrEqual(14);
 await app(page).evaluate(e=>{e.map.identity='same-map';e.map.jumpTo({center:[58.4099,53.968],zoom:15.7,pitch:60});});
 await expect.poll(()=>app(page).evaluate(e=>e.map.queryRenderedFeatures({layers:['region-buildings-3d']}).length),{timeout:90000}).toBeGreaterThan(10);
 await app(page).evaluate(e=>e.region.refreshLegend());await expect(page.locator('.legend')).toBeHidden();await page.screenshot({path:'renders/unified-city-buildings.png'});
 for(const place of ['mratkino','abzakovo']){await app(page).evaluate((e,p)=>e.region.choose(p,false),place);expect(await app(page).evaluate(e=>e.map.identity)).toBe('same-map');expect(await app(page).evaluate(e=>e.map.getLayoutProperty('region-buildings-3d','visibility'))).toBe('visible');}
 await app(page).evaluate(e=>{e.region.showCard(false);e.region.setFilters({ski:false});e.$('[data-layer=forest]').checked=false;e.region.layers();e.map.jumpTo({center:[58.141468,53.818296],zoom:13.5,pitch:72});});const canvas=page.locator('.maplibregl-canvas'),box=await canvas.boundingBox();const x=box.x+box.width*.45,y=box.y+box.height*.55;await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x,y+180,{steps:4});await page.mouse.up({button:'right'});
 await expect.poll(()=>app(page).evaluate(e=>e.map.getPitch())).toBeGreaterThan(80);expect(await app(page).evaluate(e=>e.map.getPitch())).toBeLessThanOrEqual(85);
 await page.locator('[data-action=life]').click();expect(await app(page).evaluate(e=>e.map.getLayoutProperty('region-buildings-3d','visibility'))).toBe('none');expect(errors).toEqual([]);
});
