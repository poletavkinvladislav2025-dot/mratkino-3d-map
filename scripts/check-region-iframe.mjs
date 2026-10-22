import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs';
const url=process.env.MAP_TEST_URL||'http://127.0.0.1:4181/preview/region/';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1200},reducedMotion:'reduce'});
 await page.route(/^https:\/\/tiles\.(mapterhorn|openfreemap)\.(com|org)\//,async route=>{const response=await route.fetch({url:'http://127.0.0.1:4399/?url='+encodeURIComponent(route.request().url()),timeout:60000});await route.fulfill({response});});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(`<style>body{margin:0;background:#eee}button{display:none!important}h1{font-size:90px!important;color:red!important}</style><iframe title="Тест Tilda" src="${url}?place=beloretsk" style="display:block;width:100%;height:1100px;border:0" allow="fullscreen" allowfullscreen></iframe>`);
 const frame=await (await page.locator('iframe').elementHandle()).contentFrame();await frame.waitForFunction(()=>document.querySelector('mratkino-map')?.getAttribute('data-map-state')==='ready',null,{timeout:90000});
 assert.equal(await frame.locator('h1').evaluate(el=>getComputedStyle(el).fontSize),'30px');assert.equal(await frame.locator('h1').evaluate(el=>getComputedStyle(el).color),'rgb(36, 74, 67)');
 await frame.locator('.maplibregl-ctrl-fullscreen').click();await frame.waitForFunction(()=>!!document.fullscreenElement);assert(await frame.locator('.map-wrap').evaluate(el=>Math.abs(el.clientHeight-innerHeight)<2));await frame.evaluate(()=>document.exitFullscreen());
 await page.setViewportSize({width:390,height:1100});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'renders/region-tilda-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);await page.unrouteAll({behavior:'ignoreErrors'});console.log(JSON.stringify({iframe:'passed',nestedPath:url,parentStyles:'isolated',fullscreen:'passed',mobileOverflow:false,errors}));
}finally{await browser.close()}
