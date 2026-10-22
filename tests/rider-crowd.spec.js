import {test,expect} from './tile-fixture.js';
const root=page=>page.locator('mratkino-map');
const read=(page,fn)=>root(page).evaluate(fn);

test('carving crowd renders, close-up works and the closed piste stays empty',async({page})=>{
 test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:1080});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?place=mratkino');await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:60000});
 await page.locator('[data-layer=forest]').uncheck();
 await page.locator('.trail-row[data-name="Ю4"]').click();
 await page.getByRole('button',{name:'Рассмотреть катающихся',exact:true}).click();
 await expect(root(page)).toHaveAttribute('data-scene-state','paused',{timeout:60000});
 await expect.poll(()=>read(page,el=>el.map.getZoom()),{timeout:60000}).toBeCloseTo(18,1);
 await page.waitForFunction(()=>{const el=document.querySelector('mratkino-map');return !el.map.isMoving()&&el.map.areTilesLoaded()&&el.lifeScene.stats.frames>0},null,{timeout:90000});
 const scene=await read(page,el=>({riders:el.lifeScene.stats.riders,boards:el.lifeScene.stats.snowboarders,visible:el.lifeScene.stats.visibleRiders,routes:el.lifeScene.riderRoutes.map(r=>({name:r.feature.properties.name,count:r.count,length:r.length})),triangles:el.lifeScene.renderer.info.render.triangles}));
 expect(scene.riders).toBe(360);expect(scene.boards).toBe(120);expect(scene.routes).toHaveLength(6);expect(scene.routes.every(r=>r.count===60&&r.length>0&&r.name!=='С1')).toBe(true);expect(scene.visible).toBeGreaterThan(0);expect(scene.triangles).toBeGreaterThan(100);
 // Verify actual instanced geometry follows movement, not only a changed counter.
 const before=await read(page,el=>({elapsed:el.lifeScene.elapsed,matrices:Array.from(el.lifeScene.riderParts[0].mesh.instanceMatrix.array)}));
 await page.locator('[data-action=life-pause]').click();await expect.poll(()=>read(page,el=>el.lifeScene.elapsed),{timeout:30000}).toBeGreaterThan(before.elapsed);
 await page.locator('[data-action=life-pause]').click();
 const after=await read(page,el=>({elapsed:el.lifeScene.elapsed,matrices:Array.from(el.lifeScene.riderParts[0].mesh.instanceMatrix.array),valid:el.lifeScene.riderStates.filter(r=>r.state?.visible).every(r=>r.state.inside&&Number.isFinite(r.state.heading)&&Math.abs(r.state.lean)<=.48)}));
 expect(after.valid).toBe(true);expect(after.matrices).not.toEqual(before.matrices);
 await page.screenshot({path:'renders/carving-riders.png',fullPage:true,timeout:60000});
 await page.getByRole('button',{name:'Северный склон',exact:true}).click();await page.locator('.trail-row[data-name="С1"]').click();
 await expect(page.locator('.card')).toContainText('Не работает');await expect(page.getByRole('button',{name:'Рассмотреть катающихся',exact:true})).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('phone uses 144 riders including 48 snowboarders',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?place=mratkino');await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:60000});
 await page.locator('[data-action=life]').click();await expect(root(page)).toHaveAttribute('data-scene-state','paused',{timeout:60000});
 expect(await read(page,el=>({mobile:el.lifeScene.mobile,riders:el.lifeScene.stats.riders,boards:el.lifeScene.stats.snowboarders,counts:el.lifeScene.riderRoutes.map(r=>r.count)}))).toEqual({mobile:true,riders:144,boards:48,counts:[24,24,24,24,24,24]});
});
