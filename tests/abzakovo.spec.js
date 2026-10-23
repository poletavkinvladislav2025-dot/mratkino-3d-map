import {test,expect} from './tile-fixture.js';
const root=page=>page.locator('mratkino-map');
const read=(page,fn)=>root(page).evaluate(fn);

test('Abzakovo source lines, chair capacity and animated people share the regional map',async({page})=>{
 test.setTimeout(360000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.setViewportSize({width:1440,height:1080});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?place=abzakovo');await expect(root(page)).toHaveAttribute('data-abzakovo-state','ready',{timeout:60000});await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:60000});
 await expect(page.locator('[data-abz-trail]')).toHaveCount(12);await expect(page.locator('[data-abz-lift]')).toHaveCount(8);
 expect(requests.some(u=>/resort-scene-|three.module|forest-instances/.test(u))).toBe(false);
 expect(await read(page,async el=>(await el.map.getSource('abzakovo-trails').getData()).features.length)).toBe(19);
 await read(page,el=>el.map.identity='one-abzakovo-map');
 await page.waitForFunction(()=>{const el=document.querySelector('mratkino-map');return !el.map.isMoving()&&el.map.areTilesLoaded()},null,{timeout:90000});
 await page.screenshot({path:'renders/abzakovo-overview.png',fullPage:true,timeout:60000});
 await page.locator('[data-abz-trail="1"]').click();await expect(page.locator('.abz-card')).toContainText('Нанесено участков: 3');
 await page.getByRole('button',{name:'Рассмотреть катающихся',exact:true}).click();await expect(root(page)).toHaveAttribute('data-scene-state','paused',{timeout:60000});
 await expect.poll(()=>read(page,el=>el.region.ski.scene?.stats.frames||0),{timeout:90000}).toBeGreaterThan(0);
 const scene=await read(page,el=>{const s=el.region.ski.scene;return {riders:s.stats.riders,boards:s.stats.snowboarders,visible:s.stats.visibleRiders,routes:s.routes.map(r=>({id:r.feature.properties.id,seats:r.seats,animate:r.animate})),trees:s.stats.trees};});
 expect(scene.riders).toBe(342);expect(scene.boards).toBe(114);expect(scene.visible).toBeGreaterThan(0);expect(scene.trees).toBeGreaterThan(0);expect(scene.routes).toHaveLength(8);
 expect(await read(page,el=>el.region.ski.scene.stats.forestCandidates)).toBeGreaterThan(40000);
 const carving=await read(page,el=>{const s=el.region.ski.scene,states=s.riderStates.filter(r=>r.state?.visible);return {offset:Math.max(...states.map(r=>Math.abs(r.state.offset))),lean:Math.max(...states.map(r=>Math.abs(r.state.lean))),inside:states.every(r=>r.state.inside),wide:s.riderRoutes.some(r=>r.corridor.frames.some(f=>f.left+f.right>35))};});
 expect(carving.inside).toBe(true);expect(carving.offset).toBeGreaterThan(2);expect(carving.wide).toBe(true);
 expect(await read(page,el=>({opacity:el.map.getPaintProperty('abzakovo-trail-line','line-opacity'),casing:el.map.getPaintProperty('abzakovo-trail-casing','line-color'),areas:el.region.ski.data.riderAreas.features.length}))).toEqual({opacity:1,casing:'#ffffff',areas:19});
 expect(scene.routes.find(r=>r.id==='way/30100563')).toEqual({id:'way/30100563',seats:2,animate:true});expect(scene.routes.find(r=>r.id==='way/894506057').seats).toBe(4);
 const before=await read(page,el=>({elapsed:el.region.ski.scene.elapsed,matrices:Array.from(el.region.ski.scene.riderParts[0].mesh.instanceMatrix.array)}));
 await page.locator('[data-action=life-pause]').click();await expect.poll(()=>read(page,el=>el.region.ski.scene.elapsed),{timeout:30000}).toBeGreaterThan(before.elapsed);await page.locator('[data-action=life-pause]').click();
 expect(await read(page,el=>Array.from(el.region.ski.scene.riderParts[0].mesh.instanceMatrix.array))).not.toEqual(before.matrices);
 await page.screenshot({path:'renders/abzakovo-riders.png',fullPage:true,timeout:60000});
 await page.locator('[data-layer=forest]').uncheck();expect(await read(page,el=>el.region.ski.scene.forestVisible)).toBe(false);await page.locator('[data-layer=forest]').check();
 await page.locator('[data-abz-lift="way/30100563"]').click();await expect(page.locator('.abz-card')).toContainText('07.08.2025');
 await page.locator('[data-layer=lifts]').uncheck();expect(await read(page,el=>el.map.getLayoutProperty('abzakovo-lift-line','visibility'))).toBe('none');await page.locator('[data-layer=lifts]').check();
 await read(page,el=>{window.oldAbzakovo=el.region.ski.scene;});await page.locator('.place-select').selectOption('mratkino');await expect(root(page)).toHaveAttribute('data-place','mratkino');
 expect(await page.evaluate(()=>window.oldAbzakovo.disposed)).toBe(true);expect(await read(page,el=>el.map.identity)).toBe('one-abzakovo-map');
 expect(await read(page,async el=>(await el.map.getSource('abzakovo-trails').getData()).features.length)).toBe(0);expect(errors).toEqual([]);
});

test.describe('touch iframe',()=>{
 test.use({isMobile:true,hasTouch:true});
 test('Abzakovo mobile iframe limits people and has no horizontal overflow',async({page,baseURL})=>{
  test.setTimeout(180000);page.setDefaultTimeout(20000);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}iframe{width:390px;max-width:100%;height:1100px;border:0;display:block}</style><iframe title="Карта" src="${baseURL}/?place=abzakovo"></iframe>`,{waitUntil:'domcontentloaded'});
  const frame=page.frameLocator('iframe'),map=frame.locator('mratkino-map');await expect(map).toHaveAttribute('data-abzakovo-state','ready',{timeout:60000});await expect(map).toHaveAttribute('data-map-state','ready',{timeout:60000});await expect(frame.locator('h1')).toHaveText('Абзаково');
  await frame.locator('.mobile-panel-toggle').click();await expect(frame.locator('[data-abz-trail]')).toHaveCount(12);await expect(frame.locator('[data-abz-lift]')).toHaveCount(8);await frame.locator('.mobile-panel-toggle').click();
  await frame.locator('[data-action=life]').click();await expect(map).toHaveAttribute('data-scene-state','paused',{timeout:60000});
  expect(await map.evaluate(el=>({mobile:el.region.ski.scene.mobile,riders:el.region.ski.scene.stats.riders,overflow:document.documentElement.scrollWidth>innerWidth}))).toEqual({mobile:true,riders:152,overflow:false});
  expect(await map.evaluate(el=>el.region.ski.scene.stats.forestCandidates)).toBeGreaterThan(40000);
  await page.screenshot({path:'renders/abzakovo-mobile.png',fullPage:true,timeout:60000});
  await map.evaluate(el=>{window.oldAbzakovo=el.region.ski.scene;el.region.choose('beloretsk',false);});expect(await map.evaluate(()=>window.oldAbzakovo.disposed)).toBe(true);
 });
});

test('failed Abzakovo geometry can retry without recreating the map',async({page})=>{
 test.setTimeout(150000);let fail=true;await page.route('**/region/abzakovo/trails.geojson',route=>fail?route.fulfill({status:503,body:'unavailable'}):route.continue());
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?place=abzakovo');await expect(root(page)).toHaveAttribute('data-abzakovo-state','error',{timeout:60000});
 await read(page,el=>el.map.identity='abz-retry');fail=false;await page.getByRole('button',{name:'Повторить загрузку Абзаково',exact:true}).click();await expect(root(page)).toHaveAttribute('data-abzakovo-state','ready',{timeout:60000});expect(await read(page,el=>el.map.identity)).toBe('abz-retry');
});
