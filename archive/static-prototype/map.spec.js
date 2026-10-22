import { test, expect } from '@playwright/test';

test('honest missing-data state, both slope catalogues, modal and responsive layout',async({page})=>{
 await page.route('**/data/status.json',route=>route.fulfill({json:{ready:false,message:'Рельеф не загружен: тестовое состояние отсутствующих данных'}}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:1100});await page.goto('/');
 await expect(page.locator('#footer-status')).toContainText('Геоданные не загружены');
 await expect(page.locator('.trail-row')).toHaveCount(5);
 await expect(page.locator('#scene')).toBeHidden();
 await page.getByRole('button',{name:'Северный склон С',exact:true}).click();
 await expect(page.locator('.trail-row')).toHaveCount(3);
 await page.locator('.trail-row').first().click();
 await expect(page.locator('#trail-info')).toContainText('ГЕОМЕТРИЯ НЕ ПОДТВЕРЖДЕНА');
 await expect(page.locator('#trail-info')).toContainText('Нет проверенных данных');
 await page.getByRole('button',{name:'Южный склон Ю',exact:true}).click();
 await expect(page.locator('.trail-row')).toHaveCount(5);
 await page.locator('#about').click();await expect(page.locator('dialog')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page.locator('#zoom-in')).toBeDisabled();
 await page.screenshot({path:'renders/missing-data-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'renders/missing-data-mobile.png',fullPage:true});
 await page.locator('#data-help').click();await expect(page.locator('dialog')).toBeVisible();
 await page.locator('#close-dialog').click();
 expect(errors).toEqual([]);
});

test('calibrated overlays: selection, layers, camera switch, style and shared zoom',async({page})=>{
 // Deliberately synthetic browser fixtures, intercepted only here; never shipped as map data.
 await page.route('**/data/status.json',route=>route.fulfill({json:{ready:true,styles:['A','B','C'],elevation_range:[100,200],message:'SYNTHETIC TEST FIXTURE'}}));
 const feature={id:'way/1',properties:{name:'Ю1',osm_id:'way/1',tags:{}},geometry:{type:'LineString',coordinates:[[100,100,true],[200,200,true]]}};
 await page.route('**/renders/*.json',route=>route.fulfill({json:{width:400,height:300,layers:{trails:[feature],lifts:[{...feature,id:'way/2'}],facilities:[]}}}));
 await page.route('**/renders/*.png',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#dde5dd"/><text x="20" y="50">SYNTHETIC TEST FIXTURE</text></svg>'}));
 await page.goto('/');await expect(page.locator('#scene')).toBeVisible();
 await expect(page.locator('.trail-path')).toHaveCount(1);
 await page.locator('.trail-row').first().click();await expect(page.locator('.trail-path')).toHaveClass(/highlighted/);
 await expect(page.locator('#trail-info a')).toHaveAttribute('href','https://www.openstreetmap.org/way/1');
 await page.locator('#lifts-toggle').uncheck();await expect(page.locator('[data-layer=lifts]')).toBeHidden();
 await page.locator('#zoom-in').click();await expect(page.locator('#world')).toHaveAttribute('style',/scale\(1.25\)/);
 await page.locator('#reset').click();await expect(page.locator('#world')).toHaveAttribute('style',/scale\(1\)/);
 await page.locator('[data-style=A]').click();await expect(page.locator('#render')).toHaveAttribute('src',/A-south.png/);
 await page.locator('[data-view=north]').click();await expect(page.locator('#render')).toHaveAttribute('src',/A-north.png/);
 await page.locator('[data-view=south]').click();await expect(page.locator('#render')).toHaveAttribute('src',/A-south.png/);
 await page.locator('.trail-path').focus();await page.keyboard.press('Enter');await expect(page.locator('#trail-info')).toContainText('Трасса Ю1');
});

test('missing status is reported instead of showing fabricated map',async({page})=>{
 await page.route('**/data/status.json',route=>route.fulfill({status:503,body:'unavailable'}));
 await page.goto('/');await expect(page.locator('#empty-message')).toContainText('503');
 await expect(page.locator('#scene')).toBeHidden();
});


test('actual DEM renders are delivered in desktop and mobile layouts',async({page})=>{
 const response=await page.request.get('/data/status.json');const state=await response.json();
 test.skip(!state.ready,'Actual DEM renders have not been built in this checkout');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:1100});await page.goto('/');
 await expect(page.locator('#scene')).toBeVisible();
 await expect(page.locator('#footer-status')).toContainText('Реальный DEM');
 expect(await page.locator('#render').evaluate(img=>img.naturalWidth)).toBeGreaterThan(500);
 await page.locator('#facilities-toggle').uncheck();
 await page.locator('#about').focus();await page.locator('h1').click();
 await page.screenshot({path:'renders/prototype-desktop.png',fullPage:true});
 for(const style of ['A','B','C'])for(const view of ['north','south']){
  await page.locator(`[data-style=${style}]`).click();await page.locator(`[data-view=${view}]`).click();
  await expect(page.locator('#render')).toHaveAttribute('src',new RegExp(`${style}-${view}.png`));
  await expect(page.locator('#scene')).toBeVisible();
 }
 await page.locator('[data-style=B]').click();await page.locator('[data-view=south]').click();
 await expect(page.locator('#render')).toHaveAttribute('src',/B-south.png/);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'renders/prototype-mobile.png',fullPage:true});expect(errors).toEqual([]);
});
