import {test,expect} from './tile-fixture.js';
import fs from 'node:fs';
import {fakeYandex} from './fixtures/fake-yandex.js';
test('Tilda container has measured gutters and usable controls on phones, tablets and desktops',async({page})=>{
 test.setTimeout(360000);await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(fakeYandex);
 const legacy=fs.readFileSync('tests/fixtures/tilda-legacy-map.html','utf8');
 await page.route('**/integration/layout-test.html',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif;background:#faf8f5}</style><div class="t-rec">${legacy}</div><script src="tilda-map-block.js" data-default-mode="3d" defer></script>`}));
 await page.goto('/integration/layout-test.html');const block=page.locator('.vb-map-complete'),frame=block.locator('iframe'),app=page.frameLocator('.vb-map-complete iframe').locator('mratkino-map');
 await expect.poll(()=>app.evaluate(e=>!!e.region?.bridge.ready),{timeout:90000}).toBe(true);await app.evaluate(e=>{e.$('[data-layer=forest]').checked=false;});
 const report=[];
 const sizes=[[1920,1080],[1365,900],[1024,768],[768,1024],[390,844],[360,640],[320,568],[844,390]];
 for(const [width,height] of (process.env.LAYOUT_ONLY?sizes.filter(([w])=>process.env.LAYOUT_ONLY.split(',').includes(String(w))):sizes)){
  await page.setViewportSize({width,height});
  const m=await block.evaluate(e=>{const s=e.shadowRoot,r=s.querySelector('.vb-t1__map').getBoundingClientRect(),title=s.querySelector('.vb-t1__intro').getBoundingClientRect(),bar=s.querySelector('#vb-map-modes').getBoundingClientRect();return {map:{left:r.left,right:r.right,width:r.width,height:r.height},titleLeft:title.left,barLeft:bar.left,scroll:document.documentElement.scrollWidth,viewport:innerWidth};});
  expect(m.map.left).toBeGreaterThanOrEqual(width<=640?16:24);expect(width-m.map.right).toBeGreaterThanOrEqual(width<=640?16:24);expect(m.map.width).toBeLessThanOrEqual(1296);expect(m.map.height).toBeGreaterThanOrEqual(260);expect(m.scroll).toBeLessThanOrEqual(width);expect(Math.abs(m.titleLeft-m.map.left)).toBeLessThan(2);expect(Math.abs(m.barLeft-m.map.left)).toBeLessThan(2);
  const select=async v=>width<=640?block.locator('#vb-map-modes select').selectOption(v):block.locator('#vb-map-modes [data-filter='+v+']').click();
  await select('stamps');await expect(block.locator('#vb-map-modes')).toHaveAttribute('data-mode','3d');try{await expect.poll(()=>app.evaluate(e=>e.region.markers.filter(m=>m.p.kind==='stamp-point'&&m.element.style.visibility==='visible').length),{timeout:30000}).toBe(6);}catch(error){console.log('LAYOUT_STATE',width,height,await app.evaluate(e=>({zoom:e.map.getZoom(),center:e.map.getCenter(),size:[e.map.getContainer().clientWidth,e.map.getContainer().clientHeight],filter:e.region.filters,scene:e.region.sceneVisible,suspended:e.region.parentSuspended,moving:e.region.cameraMoving,pins:e.region.markers.filter(m=>m.p.kind==='stamp-point').map(m=>({id:m.p.id,style:m.element.style.visibility,point:e.map.project(m.p.coordinates)}))})));throw error;}
  for(const rect of await block.locator('#vb-map-modes button:visible,#vb-map-modes select:visible').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};}))){expect(rect.left).toBeGreaterThanOrEqual(m.map.left-1);expect(rect.right).toBeLessThanOrEqual(m.map.right+1);expect(rect.height).toBeGreaterThanOrEqual(44);}
  await page.screenshot({path:`renders/tilda-layout-${width}x${height}.png`,fullPage:true,timeout:60000});
  await block.getByRole('button',{name:'Карта',exact:true}).click();await select('passport');expect(await block.evaluate(e=>e.shadowRoot.VisitBeloretskYandex.getState().view)).toBe('passport');await expect(frame).toBeHidden();await block.getByRole('button',{name:'3D-карта',exact:true}).click();await expect(frame).toBeVisible();
  report.push({width,height,...m});
 }
 fs.writeFileSync('docs/tilda-layout-measurements.json',JSON.stringify(report,null,2)+'\n');
});
