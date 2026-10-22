import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('downloadable standalone HTML runs live WebGL with no origin and no network',async({browser})=>{
 const filename='deliverables/mratkino-3d.html';test.skip(!fs.existsSync(filename),'Build standalone artifact with npm run build:standalone first');
 const context=await browser.newContext({offline:true,reducedMotion:'reduce',viewport:{width:1280,height:960}});const page=await context.newPage();const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 await page.setContent(fs.readFileSync(filename,'utf8'));
 await expect(page.locator('mratkino-map')).toHaveAttribute('data-map-state','ready',{timeout:45000});
 const height=await page.locator('mratkino-map').evaluate(el=>el.map.queryTerrainElevation([58.4371909,53.9974603]));expect(height).toBeGreaterThan(750);expect(height).toBeLessThan(850);
 await page.locator('[data-action=life]').click();await expect(page.locator('mratkino-map')).toHaveAttribute('data-scene-state','paused',{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('mratkino-map').lifeScene.stats.frames>0);
 await page.getByRole('button',{name:'Северный склон',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('mratkino-map').map.isMoving());
 await expect(page.locator('.trail-row')).toHaveCount(3);await expect(page.locator('canvas')).toHaveCount(1);await page.screenshot({path:'renders/live-offline.png',fullPage:true});expect(errors).toEqual([]);expect(external).toEqual([]);await context.close();
});
