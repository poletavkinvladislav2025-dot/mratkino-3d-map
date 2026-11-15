import {test,expect} from './tile-fixture.js';
async function ordinaryError(block){return block.evaluate(h=>{const s=h.shadowRoot,map=s.querySelector('#vbT1MapContainer').getBoundingClientRect(),desktop=document.documentElement.clientWidth>960,card=s.querySelector(desktop?'#vbT1Panel':'#vbT1Mcard').getBoundingClientRect();const marker=[...s.querySelectorAll('.vb-osm-pm')].find(e=>e.style.width==='30px'&&e.style.height==='36px');if(!marker)return 1e6;const p=marker.getBoundingClientRect(),x=p.left+15,y=p.top+36,tx=desktop?(map.left+card.left)/2:map.left+map.width/2,ty=desktop?map.top+map.height/2:(map.top+card.top)/2;return Math.hypot(x-tx,y-ty);});}
test('ordinary places stay in the free-area centre through navigation, resizing and expanded mobile cards',async({page})=>{
 test.setTimeout(180000);await page.route('**/integration/place-focus-check.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div class="t-rec"><script src="tilda-map-block.js" defer></script></div>'}));await page.goto('/integration/place-focus-check.html');const block=page.locator('.vb-map-complete');await expect.poll(()=>block.evaluate(h=>!!h.shadowRoot.VisitBeloretskYandex?.getState()),{timeout:60000}).toBe(true);
 for(const width of [1365,390,768,1100]){await page.setViewportSize({width,height:900});await block.evaluate(h=>h.shadowRoot.VisitBeloretskYandex.openPlace('waterTower'));await expect.poll(()=>ordinaryError(block),{timeout:30000}).toBeLessThan(2);await page.screenshot({path:'/workspace/artifacts/place-focus-'+width+'.png',timeout:60000});await expect.poll(()=>ordinaryError(block),{timeout:30000}).toBeLessThan(2);
  await block.locator(width>960?'#vbT1Next':'#vbT1McardNext').click();await expect.poll(()=>ordinaryError(block),{timeout:30000}).toBeLessThan(2);
  if(width===390){await block.locator('#vbT1McardToggle').click();await expect.poll(()=>ordinaryError(block),{timeout:30000}).toBeLessThan(2);}
 }
 const before=await block.evaluate(h=>h.shadowRoot.VisitBeloretskYandex.getCamera());await block.locator('#vbT1PanelClose').click();const after=await block.evaluate(h=>h.shadowRoot.VisitBeloretskYandex.getCamera());expect(after.center[0]).toBeCloseTo(before.center[0],5);expect(after.center[1]).toBeCloseTo(before.center[1],5);
});
test('3D place anchors stay centred left of the sidebar and above the mobile card',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1365,height:900});await page.goto('/?place=waterTower&effects=0');const app=page.locator('mratkino-map');await expect(app).toHaveAttribute('data-map-state','ready',{timeout:90000});
 const error=()=>app.evaluate(h=>{const m=h.map,box=m.getContainer().getBoundingClientRect(),card=h.$('.sidebar').getBoundingClientRect(),p=m.project(h.region.preset().center),desktop=innerWidth>760,x=desktop?(card.left-box.left)/2:box.width/2,y=desktop?box.height/2:(card.top-box.top)/2;return Math.hypot(p.x-x,p.y-y);});
 for(const width of [1365,390,768]){await page.setViewportSize({width,height:900});await app.evaluate(h=>{void h.region.choose('waterTower',false);});await expect.poll(error,{timeout:45000}).toBeLessThan(3);}
});

test('ordinary places reset route insets before focusing beside their card',async({page})=>{
 test.setTimeout(180000);await page.route('**/integration/place-focus-check.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div class="t-rec"><script src="tilda-map-block.js" defer></script></div>'}));await page.goto('/integration/place-focus-check.html');const block=page.locator('.vb-map-complete');await expect.poll(()=>block.evaluate(h=>!!h.shadowRoot.VisitBeloretskYandex?.getState()),{timeout:60000}).toBe(true);

 await block.evaluate(h=>Promise.race([h.shadowRoot.VisitBeloretskYandex.openRoute('rassypnaya-shushpa'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Route selection did not release the UI')),5000))]));await block.evaluate(h=>h.shadowRoot.VisitBeloretskYandex.openPlace('waterTower'));await expect.poll(()=>ordinaryError(block),{timeout:30000}).toBeLessThan(2);

});
