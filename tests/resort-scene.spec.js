import {test,expect} from './tile-fixture.js';
const root=page=>page.locator('mratkino-map');
const read=(page,fn)=>root(page).evaluate(fn);
async function ready(page){await page.goto('/');await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:45000});await page.waitForFunction(()=>{const m=document.querySelector('mratkino-map').map;return !m.isMoving()&&m.areTilesLoaded()});}

test('3D trees and real lift routes render; animation pauses, layers and cleanup work',async({page})=>{
 test.setTimeout(360000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1050});await ready(page);
 expect(await read(page,el=>!!el.map.getLayer('resort-life'))).toBe(false);
 await expect(page.locator('.route-label').filter({hasText:'Ю3'})).toHaveText('Ю3');
 await page.locator('[data-action=life]').click();await expect(root(page)).toHaveAttribute('data-scene-state','playing',{timeout:30000});
 await expect.poll(()=>read(page,el=>el.lifeScene?.stats.canopyClusters||0)).toBeGreaterThan(100);
 await expect.poll(()=>read(page,el=>el.lifeScene?.stats.frames||0)).toBeGreaterThan(1);
 expect(await read(page,el=>el.lifeScene.stats.saplings)).toBeGreaterThan(10);
 expect(await read(page,el=>el.lifeScene.stats.riders)).toBe(24);
 expect(await read(page,el=>el.lifeScene.riderRoutes.map(r=>r.feature.properties.name).sort())).toEqual(['С2','С3','Ю1','Ю2','Ю3','Ю4']);
 expect(await read(page,el=>el.lifeScene.riderRoutes.every(r=>r.length>0&&r.points[0][2]>r.points.at(-1)[2]))).toBe(true);
 expect(await read(page,el=>el.lifeScene.routes.filter(r=>r.chair).length)).toBe(2);
 expect(await read(page,el=>el.lifeScene.routes.every(r=>r.length>0))).toBe(true);
 expect(await read(page,el=>el.lifeScene.renderer.info.render.triangles)).toBeGreaterThan(100);
 await page.locator('[data-action=life-pause]').click();await expect(root(page)).toHaveAttribute('data-scene-state','paused');
 const frozen=await read(page,el=>el.lifeScene.elapsed);await page.waitForTimeout(400);expect(await read(page,el=>el.lifeScene.elapsed)).toBe(frozen);
 await page.getByRole('button',{name:'Северный склон',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('mratkino-map').map.isMoving());
 await page.locator('.trail-row[data-name="С1"]').click();await expect(page.locator('.card')).toContainText('Не работает');await expect(page.locator('.card')).toContainText('по сведениям владельца');
 await page.locator('.lift-row').filter({hasText:'Север'}).click();await page.getByRole('button',{name:'Рассмотреть в 3D'}).click();await page.waitForFunction(()=>!document.querySelector('mratkino-map').map.isMoving());
 expect(await read(page,el=>el.lifeScene.stats.trees)).toBeGreaterThan(100);
 await page.screenshot({path:'renders/living-north-lift.png',fullPage:true});
 await page.locator('[data-layer=forest]').uncheck();expect(await read(page,el=>el.lifeScene.forestVisible)).toBe(false);
 await page.locator('[data-layer=lifts]').uncheck();expect(await read(page,el=>el.lifeScene.liftsVisible)).toBe(false);
 await page.locator('[data-layer=forest]').check();await page.locator('[data-layer=lifts]').check();
 await page.locator('.map-wrap').scrollIntoViewIfNeeded();await page.bringToFront();await page.locator('[data-action=life-pause]').click();await expect(root(page)).toHaveAttribute('data-scene-state','playing');console.log('Scene resumed',await read(page,el=>({visible:el.lifeScene.inViewport,paused:el.lifeScene.paused,documentHidden:document.hidden,frames:el.lifeScene.stats.frames,triangles:el.lifeScene.renderer.info.render.triangles,scrollY})));await expect.poll(()=>read(page,el=>el.lifeScene.elapsed),{timeout:20000}).toBeGreaterThan(frozen);
 await page.locator('[data-action=life]').click();await expect(root(page)).toHaveAttribute('data-scene-state','off');
 const stopped=await read(page,el=>el.lifeScene.elapsed);await page.waitForTimeout(300);expect(await read(page,el=>el.lifeScene.elapsed)).toBe(stopped);
 await read(page,el=>{window.__oldScene=el.lifeScene;el.remove();document.querySelector('#app').append(el)});
 expect(await page.evaluate(()=>window.__oldScene.disposed)).toBe(true);expect(await page.evaluate(()=>window.__oldScene.timer===null)).toBe(true);
 await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:45000});expect(errors).toEqual([]);
});

test('mobile opts into fewer trees and reduced motion starts paused',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
 await page.getByRole('button',{name:'Северный склон',exact:true}).click();
 await page.locator('[data-action=life]').click();await expect(root(page)).toHaveAttribute('data-scene-state','paused',{timeout:30000});
 expect(await read(page,el=>el.lifeScene.mobile)).toBe(true);
 expect(await read(page,el=>el.lifeScene.stats.forestCandidates)).toBe(80058);
 expect(await read(page,el=>el.lifeScene.stats.vehicles)).toBe(36);expect(await read(page,el=>el.lifeScene.farCrowns.count)).toBeLessThan(12000);
 await page.waitForFunction(()=>document.querySelector('mratkino-map').lifeScene.stats.frames>0);
 await page.screenshot({path:'renders/living-mobile.png',fullPage:true});
});
