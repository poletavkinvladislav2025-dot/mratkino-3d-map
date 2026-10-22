import {test,expect} from './tile-fixture.js';
const root=page=>page.locator('mratkino-map');
const read=(page,fn)=>root(page).evaluate(fn);
async function settled(page){await page.waitForFunction(()=>{const el=document.querySelector('mratkino-map');return el?.getAttribute('data-map-state')==='ready'&&!el.map.isMoving()&&el.map.areTilesLoaded()},null,{timeout:90000});}

test('five real-network route choices share one 3D map; nature cells load on demand and dispose',async({page})=>{
 test.setTimeout(360000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.setViewportSize({width:1440,height:1080});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?place=malinovaya');await expect(root(page)).toHaveAttribute('data-hiking-state','ready',{timeout:60000});await settled(page);
 expect(requests.some(u=>/nature-scene|three.module|nature-index|\/tiles\/\d+-\d+\.json|\/live\/trails/.test(u))).toBe(false);
 await read(page,el=>el.map.identity='shared-hiking-map');
 for(const id of ['first-return','third','three-peaks']){
  await page.locator(`[data-route="${id}"]`).click();await expect(root(page)).toHaveAttribute('data-route','malinovaya/'+id);
  const data=await read(page,async el=>({line:(await el.map.getSource('hiking-routes').getData()).features,points:(await el.map.getSource('hiking-stops').getData()).features}));expect(data.line).toHaveLength(1);expect(data.line[0].properties.id).toBe(id);
  if(id==='three-peaks')expect(data.points.map(p=>p.properties.key)).toEqual(['bel','first','second','third','otn']);
 }
 await page.locator('[data-action=mode]').click();await expect.poll(()=>read(page,el=>el.map.getPitch())).toBeLessThan(10);await page.locator('[data-route=three-peaks]').click();await expect(page.locator('[data-action=mode]')).toHaveText('2D');expect(await read(page,el=>el.mode2D)).toBe(false);
 await settled(page);await page.screenshot({path:'renders/hiking-malinovaya.png',fullPage:true,timeout:60000});
 await page.locator('.place-select').selectOption('yalangas');await expect(root(page)).toHaveAttribute('data-route','yalangas/a1',{timeout:60000});
 for(const id of ['a1','a2']){await page.locator(`[data-route="${id}"]`).click();await expect(root(page)).toHaveAttribute('data-route','yalangas/'+id);}
 await page.getByRole('button',{name:'Показать путь обратно',exact:true}).click();expect(await read(page,async el=>{const c=(await el.map.getSource('hiking-routes').getData()).features[0].geometry.coordinates;return JSON.stringify(c)===JSON.stringify([...el.region.hiking.route.geometry.coordinates].reverse());})).toBe(true);
 expect(await read(page,async el=>(await el.map.getSource('hiking-stops').getData()).features.map(f=>[f.properties.key,f.properties.role,f.properties.sequence]))).toEqual([['yal','start',1],['a2','finish',2]]);
 await settled(page);await page.screenshot({path:'renders/hiking-yalangas.png',fullPage:true,timeout:60000});
 await page.locator('[data-action=life]').click();await expect(root(page)).toHaveAttribute('data-scene-state','nature',{timeout:60000});
 await expect.poll(()=>read(page,el=>el.region.hiking.nature?.stats.trees||0),{timeout:90000}).toBeGreaterThan(10);await settled(page);
 expect(await read(page,el=>el.region.hiking.nature.stats.loadedCells)).toBeLessThanOrEqual(4);
 expect(await read(page,el=>el.region.hiking.nature.stats.trees)).toBeLessThanOrEqual(2400);
 expect(await read(page,async el=>(await el.map.getSource('nature-surfaces').getData()).features.some(f=>['bare_rock','scree','cliff'].includes(f.properties.kind)))).toBe(true);
 await page.screenshot({path:'renders/hiking-yalangas-nature.png',fullPage:true,timeout:60000});
 await read(page,el=>{window.oldNature=el.region.hiking.nature;});await page.locator('[data-action=life]').click();expect(await page.evaluate(()=>window.oldNature.disposed&&window.oldNature.cache.size===0&&window.oldNature.pending.size===0)).toBe(true);expect(await read(page,async el=>(await el.map.getSource('nature-surfaces').getData()).features.length)).toBe(0);
 await page.locator('.place-select').selectOption('mratkino');await expect(root(page)).toHaveAttribute('data-place','mratkino');await settled(page);expect(await read(page,el=>el.map.identity)).toBe('shared-hiking-map');expect(await read(page,async el=>(await el.map.getSource('hiking-routes').getData()).features.length)).toBe(0);expect(errors).toEqual([]);
});

test.describe('touch iframe',()=>{
test.use({isMobile:true,hasTouch:true});
test('mobile Tilda-sized iframe shows Malinovaya routes and bounded local forest',async({page,baseURL})=>{
 test.setTimeout(240000);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await page.setContent(`<style>*{box-sizing:border-box}body{margin:0}iframe{width:100%;height:1100px;border:0;display:block}</style><iframe title="Тест карты в Tilda" src="${baseURL}/?place=malinovaya"></iframe>`);
 const frame=page.frameLocator('iframe'),map=frame.locator('mratkino-map');await expect(map).toHaveAttribute('data-hiking-state','ready',{timeout:60000});await expect(map).toHaveAttribute('data-map-state','ready',{timeout:60000});
 await frame.locator('.mobile-panel-toggle').click();await expect(frame.locator('.hiking-options button')).toHaveCount(3);await frame.locator('[data-route=first-return]').click();
 await frame.locator('.mobile-panel-toggle').click();await frame.locator('[data-action=life]').click();await expect(map).toHaveAttribute('data-scene-state','nature',{timeout:60000});
 await expect.poll(()=>map.evaluate(el=>el.region.hiking.nature?.stats.trees||0),{timeout:90000}).toBeGreaterThan(0);
 expect(await map.evaluate(el=>({cells:el.region.hiking.nature.stats.loadedCells,trees:el.region.hiking.nature.stats.trees,overflow:document.documentElement.scrollWidth>innerWidth}))).toEqual(expect.objectContaining({overflow:false}));
 expect(await map.evaluate(el=>el.region.hiking.nature.stats.loadedCells)).toBeLessThanOrEqual(2);expect(await map.evaluate(el=>el.region.hiking.nature.stats.trees)).toBeLessThanOrEqual(700);
 await page.screenshot({path:'renders/hiking-malinovaya-mobile.png',fullPage:true,timeout:60000});
 await map.evaluate(el=>{window.oldNature=el.region.hiking.nature;el.region.choose('beloretsk',false);});expect(await map.evaluate(()=>window.oldNature.disposed)).toBe(true);
});
});
