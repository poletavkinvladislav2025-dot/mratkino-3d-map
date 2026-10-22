/** Check built assets inside an iframe, independent of the parent's CSS. */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1060}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const embed=fs.readFileSync('public/tilda-embed.html','utf8').replace('https://poletavkinvladislav2025-dot.github.io/mratkino-3d-map/','http://127.0.0.1:4173/');
 await page.setContent(`<style>body{margin:0;padding:12px;font:40px serif;background:#eff4ed}button{background:red!important}h1{font-size:80px!important}</style>${embed}`);
 const frame=await (await page.locator('iframe').elementHandle()).contentFrame();
 await frame.waitForFunction(()=>document.querySelector('mratkino-map')?.getAttribute('data-map-state')==='ready',{timeout:60000});
 await frame.waitForFunction(()=>{const m=document.querySelector('mratkino-map').map;return !m.isMoving()&&m.areTilesLoaded()});
 const height=await frame.locator('mratkino-map').evaluate(el=>el.map.queryTerrainElevation([58.4371909,53.9974603]));assert(height>750&&height<850);
 assert.equal(await frame.locator('h1').evaluate(el=>getComputedStyle(el).fontSize),'34px');
 await page.screenshot({path:'renders/embed-desktop.png',fullPage:true});
 await frame.locator('.maplibregl-ctrl-fullscreen').click();await frame.waitForFunction(()=>!!document.fullscreenElement);
 assert(await frame.locator('.map-wrap').evaluate(el=>Math.abs(el.getBoundingClientRect().height-innerHeight)<2));
 await frame.evaluate(()=>document.exitFullscreen());
 await page.setViewportSize({width:390,height:940});await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'renders/embed-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({productionIframe:'passed',terrainHeight:height,fullscreen:'native passed',parentStyles:'isolated',errors}));
}finally{await browser.close()}
