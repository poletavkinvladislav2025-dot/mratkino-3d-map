import {test,expect} from './tile-fixture.js';
const root=page=>page.locator('mratkino-map');
const read=(page,fn)=>root(page).evaluate(fn);
async function ready(page,query='place=all'){
 await page.goto('/?'+query);await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});
 await expect.poll(()=>read(page,el=>!!el.region.bootstrapped),{timeout:90000}).toBe(true);
 await read(page,el=>{window.mapErrors=[];el.map.on('error',e=>{if(!/abort/i.test(e.error?.message||''))window.mapErrors.push(e.error?.message);});});
}
async function camera(page,center,zoom=14){await root(page).evaluate((el,{center,zoom})=>{el.map.stop();el.map.jumpTo({center,zoom,pitch:45,bearing:0});el.region.sync();},{center,zoom});}

test('viewport loads resort and hiking geometry without selecting a place or moving camera',async({page})=>{
 test.setTimeout(300000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.setViewportSize({width:1365,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await ready(page);expect(requests.some(u=>/forest-instances|resort-scene-|live\/trails/.test(u))).toBe(false);await expect(page.locator('.sidebar')).toBeHidden();await expect(page.locator('.place-select option')).toHaveCount(24);
 await page.waitForFunction(()=>document.querySelector('mratkino-map').map.areTilesLoaded(),null,{timeout:90000});await page.screenshot({path:'renders/explorer-overview.png'});await page.locator('.place-select').selectOption('abzakovo');await expect(root(page)).toHaveAttribute('data-abzakovo-state','ready',{timeout:60000});
 await page.locator('[data-abz-trail="1"]').click();await expect(root(page)).toHaveAttribute('data-route','abzakovo/trail/1');
 expect(await read(page,el=>el.region.ski.selected.length)).toBe(3);await expect(page.locator('[data-abz-trail]')).toHaveCount(13);await expect(page.locator('.abz-card')).toContainText('Средняя');
 await page.screenshot({path:'renders/explorer-abzakovo.png'});
 const before=await read(page,el=>({center:el.map.getCenter().toArray(),zoom:el.map.getZoom(),pitch:el.map.getPitch()}));await page.getByRole('button',{name:'Закрыть карточку',exact:true}).click();expect(await read(page,el=>({center:el.map.getCenter().toArray(),zoom:el.map.getZoom(),pitch:el.map.getPitch()}))).toEqual(before);
 await camera(page,[58.44,54]);await expect(root(page)).toHaveAttribute('data-visible-areas',/mratkino/,{timeout:60000});await expect.poll(()=>read(page,el=>el.resortLoaded),{timeout:60000}).toBe(true);
 await expect(root(page)).toHaveAttribute('data-place','abzakovo');await expect(root(page)).toHaveAttribute('data-route','abzakovo/trail/1');await expect(page.locator('.sidebar')).toBeHidden();expect(await read(page,el=>el.map.getCenter().toArray())).toEqual([58.44,54]);
 expect(await read(page,async el=>(await el.map.getSource('trails').getData()).features.length)).toBeGreaterThan(7);
 await camera(page,[58.30,54.10]);await expect.poll(()=>read(page,el=>el.region.hiking.datasets.has('yalangas')),{timeout:60000}).toBe(true);await expect(root(page)).toHaveAttribute('data-place','abzakovo');
 expect(await read(page,async el=>(await el.map.getSource('hiking-routes').getData()).features.length)).toBe(2);expect(await read(page,el=>el.map.getCenter().toArray())).toEqual([58.30,54.10]);
 await read(page,el=>el.region.openRoute('yalangas/a1',{focus:false}));await expect(root(page)).toHaveAttribute('data-route','yalangas/a1');await expect(page.locator('.hiking-card')).toContainText('OSM');
 await page.getByRole('button',{name:'Слои карты',exact:true}).click();await page.locator('[data-layer=labels]').uncheck();expect(await read(page,el=>el.region.markers.every(m=>m.element.style.visibility==='hidden'))).toBe(true);
 expect(await page.getByRole('button',{name:'Рассмотреть катающихся',exact:true}).count()).toBe(0);expect(errors).toEqual([]);expect(await page.evaluate(()=>window.mapErrors)).toEqual([]);
});

test('one effects preference survives moving, suspends resources and restores the same map',async({page})=>{
 test.setTimeout(360000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:850});await page.emulateMedia({reducedMotion:'reduce'});await ready(page,'place=abzakovo');
 await read(page,el=>el.map.identity='explorer-single-map');await camera(page,[58.628,53.802],16);await page.locator('[data-action=life]').click();await expect.poll(()=>read(page,el=>!!el.region.ski.scene),{timeout:90000}).toBe(true);
 await expect.poll(()=>read(page,el=>el.region.ski.scene?.stats.frames||0),{timeout:90000}).toBeGreaterThan(0);const stats=await read(page,el=>el.region.ski.scene.stats);expect(stats.riders).toBe(342);expect(stats.snowboarders).toBe(114);expect(stats.forestCandidates).toBeGreaterThan(40000);expect(stats.trees).toBeGreaterThan(0);
 await read(page,el=>{window.oldScene=el.region.ski.scene;el.region.suspend(true);});expect(await page.evaluate(()=>window.oldScene.disposed)).toBe(true);expect(await read(page,el=>el.region.effectsWanted)).toBe(true);
 await read(page,el=>el.region.suspend(false));await expect.poll(()=>read(page,el=>!!el.region.ski.scene),{timeout:60000}).toBe(true);
 await camera(page,[58.444,53.997],15.5);await expect.poll(()=>read(page,el=>!!el.lifeScene),{timeout:90000}).toBe(true);expect(await read(page,el=>!el.region.ski.scene&&el.region.effectsWanted&&el.map.identity==='explorer-single-map')).toBe(true);
 await read(page,el=>el.lifeScene.setPaused(false));await expect.poll(()=>read(page,el=>el.lifeScene.elapsed),{timeout:30000}).toBeGreaterThan(0);await read(page,el=>el.lifeScene.setPaused(true));
 await page.screenshot({path:'renders/explorer-mratkino.png',timeout:60000});await page.locator('[data-action=life]').click();expect(await read(page,el=>!el.lifeScene&&!el.region.ski.scene&&!el.region.hiking.enabled)).toBe(true);
 expect(errors).toEqual([]);expect(await page.evaluate(()=>window.mapErrors)).toEqual([]);
});

test('parent protocol queues, validates origin/source, avoids echoes, restores hidden iframe',async({page})=>{
 test.setTimeout(300000);await page.setViewportSize({width:1280,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/integration-demo.html');
 const frame=page.frameLocator('iframe'),el=frame.locator('mratkino-map');await expect(el).toHaveAttribute('data-map-state','ready',{timeout:90000});await expect(page.locator('#events')).toContainText('ready',{timeout:90000});
 await page.evaluate(()=>{window.received=[];window.addEventListener('message',e=>{if(e.data?.type==='vb3d.event')window.received.push(e.data);});});
 await el.evaluate(el=>{const base={type:'vb3d.command',version:1,id:'bad-source',command:'openPlace',payload:{placeId:'mratkino'}};window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source:window,data:base}));window.dispatchEvent(new MessageEvent('message',{origin:'https://wrong.example',source:window.parent,data:{...base,id:'bad-origin'}}));});
 expect(await el.evaluate(el=>el.region.id)).toBe('all');
 await page.getByRole('button',{name:'Трасса №1 Абзаково',exact:true}).click();await expect(el).toHaveAttribute('data-route','abzakovo/trail/1',{timeout:60000});
 await expect.poll(()=>page.evaluate(()=>window.received.some(e=>e.event==='commandResult'&&e.payload.command==='openRoute')),{timeout:60000}).toBe(true);
 expect(await page.evaluate(()=>window.received.filter(e=>['placeSelected','routeSelected','cameraChanged'].includes(e.event)))).toEqual([]);
 await page.getByRole('button',{name:'Скрыть карту',exact:true}).click();await expect.poll(()=>el.evaluate(el=>el.region.parentSuspended)).toBe(true);await page.getByRole('button',{name:'Показать карту',exact:true}).click();await expect.poll(()=>el.evaluate(el=>!el.region.parentSuspended)).toBe(true);
 await page.getByRole('button',{name:'Центр Белорецка',exact:true}).click();await expect.poll(()=>el.evaluate(el=>Math.abs(el.map.getCenter().lng-58.41)<.00001)).toBe(true);expect(await el.evaluate(el=>el.region.id)).toBe('abzakovo');
 await el.evaluate(el=>el.map.jumpTo({center:[58.44,54],zoom:14}));await expect.poll(()=>page.evaluate(()=>window.received.some(e=>e.event==='cameraChanged'))).toBe(true);
 await el.evaluate(el=>el.region.bridge.updateURL());await expect.poll(()=>el.evaluate(()=>location.search.includes('place=abzakovo')&&location.search.includes('route=abzakovo%2Ftrail%2F1'))).toBe(true);
});

test('mobile card, direct route URL, layers and fullscreen keep a usable layout',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await ready(page,'place=abzakovo&route=abzakovo/trail/9&effects=0');
 await expect(root(page)).toHaveAttribute('data-route','abzakovo/trail/9');await expect(page.locator('.abz-card')).toContainText('Лёгкая');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const box=await page.locator('.sidebar').boundingBox();expect(box.height).toBeLessThan(844*.4);await page.screenshot({path:'renders/explorer-mobile.png'});
 await page.getByRole('button',{name:'Закрыть карточку',exact:true}).click();await page.getByRole('button',{name:'Слои карты',exact:true}).click();await page.locator('[data-layer=lifts]').uncheck();expect(await read(page,el=>el.map.getLayoutProperty('abzakovo-lift-line','visibility'))).toBe('none');
 await page.getByRole('button',{name:'Слои карты',exact:true}).click();await page.locator('[data-action=mode]').click();await expect.poll(()=>read(page,el=>el.map.getPitch())).toBe(0);
 await page.locator('.maplibregl-ctrl-fullscreen').click();await expect.poll(()=>read(page,el=>!!(document.fullscreenElement||el.shadowRoot.fullscreenElement))).toBe(true);await page.evaluate(()=>document.exitFullscreen());
});


test('data failure and WebGL retry recover without losing explicit selection',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});let fail=true;
 await page.route('**/region/abzakovo/trails.geojson',r=>fail?r.fulfill({status:503,body:'QA: unavailable'}):r.continue());
 await page.goto('/?place=abzakovo&effects=0');await expect(root(page)).toHaveAttribute('data-abzakovo-state','error',{timeout:60000});await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});
 await read(page,el=>el.map.identity='data-retry-map');fail=false;await page.getByRole('button',{name:'Повторить загрузку объектов',exact:true}).click();await expect(root(page)).toHaveAttribute('data-abzakovo-state','ready',{timeout:60000});expect(await read(page,el=>el.map.identity)).toBe('data-retry-map');
 await page.locator('[data-abz-trail="9"]').click();await read(page,el=>el.fallback('Проверка восстановления WebGL'));await expect(root(page)).toHaveAttribute('data-map-state','fallback');
 await page.locator('[data-action=retry]').click();await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});await expect(root(page)).toHaveAttribute('data-route','abzakovo/trail/9');await expect(page.locator('.abz-card')).toContainText('Лёгкая');
 expect(await read(page,el=>el.map.getContainer().querySelectorAll('canvas').length)).toBe(1);
});
