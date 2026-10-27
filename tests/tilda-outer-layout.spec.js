import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {fakeYandex} from './fixtures/fake-yandex.js';
test('Tilda reset cannot cancel map centering or responsive gutters',async({page})=>{
 await page.addInitScript(fakeYandex);await page.route('https://static.tildacdn.com/**',r=>r.abort());
 const old=fs.readFileSync('tests/fixtures/tilda-legacy-map.html','utf8');
 await page.route('**/integration/outer-test.html',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}#allrecords div{margin:0!important;padding:0!important}</style><div id="allrecords"><div class="t-rec">${old}</div><div class="t-rec" id="map-record"><div class="t123"><div class="t-container_100"><div class="t-width t-width_100"><script src="tilda-map-block.js" defer></script></div></div></div></div></div>`}));
 await page.goto('/integration/outer-test.html');const block=page.locator('.vb-map-complete');await expect(block.locator('#vb-map-modes')).toBeVisible();
 await expect(block.locator('#vb-map-modes')).toHaveAttribute('data-mode','yandex');
 await expect(block.locator('#vb-map-modes')).toHaveAttribute('data-filter','places');
 await expect(block.locator('iframe')).not.toHaveAttribute('src',/.+/);
 const measurements=[];
 for(const [width,height] of [[1920,1080],[1365,900],[768,1024],[390,844],[320,568]]){
  await page.setViewportSize({width,height});
  const m=await block.evaluate(e=>{const s=e.shadowRoot,r=s.querySelector('.vb-t1__map').getBoundingClientRect(),h=s.querySelector('h1').getBoundingClientRect(),bar=s.querySelector('#vb-map-modes').getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,title:h.left,controls:bar.left,padding:getComputedStyle(e).padding,overflow:document.documentElement.scrollWidth>innerWidth};});
  const gutter=width<=640?16:width<=960?24:32;
  expect(m.left).toBeGreaterThanOrEqual(gutter);expect(Math.abs(m.left-(width-m.right))).toBeLessThan(1);expect(m.width).toBeLessThanOrEqual(1296);expect(m.title).toBeCloseTo(m.left,0);expect(m.controls).toBeCloseTo(m.left,0);expect(m.overflow).toBe(false);
  await expect(page.locator('#map-record')).toHaveCSS('background-color','rgb(250, 248, 245)');measurements.push({width,height,...m});
 }
 fs.writeFileSync('docs/tilda-outer-measurements.json',JSON.stringify(measurements,null,2)+'\n');
});
