import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {relayTiles} from './tile-fixture.js';
test('live Yandex API renders the complete ordinary block and changes filter bounds',async({browser})=>{
 test.setTimeout(180000);
 const context=await browser.newContext({viewport:{width:1365,height:900},...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
 const page=await context.newPage(),errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push([r.url(),r.failure()?.errorText]));
 await relayTiles(page);
 try{
 await page.route('**/integration/complete-demo.html',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync('tests/fixtures/tilda-complete.html','utf8')}));
 await page.goto('http://127.0.0.1:5175/integration/complete-demo.html');
 await expect.poll(()=>page.evaluate(()=>!!document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex?.getState()),{timeout:90000}).toBe(true);
 await expect(page.locator('.ymaps-2-1-79-map, [class*="ymaps-"][class$="-map"]').first()).toBeVisible({timeout:30000});
 await page.locator('#vb-map-modes [data-filter=stamps]').click();await expect.poll(()=>page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.getState().view)).toBe('stamps');
 await page.locator('#vb-map-modes [data-filter=passport]').click();await expect.poll(()=>page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.getState().view)).toBe('passport');
 await expect.poll(()=>page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.getCamera().zoom),{timeout:15000}).toBeGreaterThan(12.4);
 await page.waitForLoadState('networkidle',{timeout:20000});
 // Allow the provider's bitmap crossfade to finish before taking the visual record.
 await page.waitForTimeout(3000);
 await page.screenshot({path:'renders/filter-yandex-live.png'});
 await page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.openPlace('kiosk3'));
 await expect(page.locator('#vbT1Panel')).toContainText('Центральная площадь');
 await page.getByRole('button',{name:'3D-карта',exact:true}).click();const app=page.frameLocator('iframe').locator('mratkino-map');
 await expect.poll(()=>app.evaluate(e=>e.region?.id),{timeout:90000}).toBe('kiosk3');
 expect(await app.evaluate(e=>e.region.filters.passport)).toBe(true);
 await page.getByRole('button',{name:'Карта',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.querySelector('.vb-map-complete').shadowRoot.VisitBeloretskYandex.getState().sourceId)).toBe('kiosk3');
 expect(errors).toEqual([]);
 }catch(e){console.log(JSON.stringify({errors,failures:failures.slice(0,10)}));throw e;}finally{await context.close();}
});
