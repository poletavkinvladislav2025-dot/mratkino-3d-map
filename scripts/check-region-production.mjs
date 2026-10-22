/** Real-data checks against the built, nested Pages preview; records decoded response bytes. */
import {chromium} from '@playwright/test';
import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.env.MAP_TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const report={url:base,measuredAt:new Date().toISOString(),bytes:'decoded response bodies; browser HTTP cache disabled by test interception; not compressed network transfer',phases:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});const jobs=[];let phase;
 await page.route(/^https:\/\/tiles\.(mapterhorn|openfreemap)\.(com|org)\//,async route=>{const response=await route.fetch({url:'http://127.0.0.1:4399/?url='+encodeURIComponent(route.request().url()),timeout:60000});await route.fulfill({response});});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',response=>{if(!phase||response.status()!==200)return;const current=phase;jobs.push((async()=>{try{const body=await response.body(),url=response.url(),kind=/tiles\.mapterhorn/.test(url)?'dem':/tiles\.openfreemap/.test(url)?'vector':/\/live\/|\/region\/mratkino-facilities/.test(url)?'resortData':/resort-scene|forest-instances/.test(url)?'scene':'app';current.bytes[kind]=(current.bytes[kind]||0)+body.length;current.requests++;current.urls.push(url);}catch{}})());});
 const ready=async()=>{await page.waitForFunction(()=>document.querySelector('mratkino-map')?.getAttribute('data-map-state')==='ready',null,{timeout:90000});await page.waitForFunction(()=>{const m=document.querySelector('mratkino-map').map;return !m.isMoving()&&m.areTilesLoaded()},null,{timeout:90000});};
 const start=name=>{console.log('Checking:',name);phase={name,bytes:{},requests:0,urls:[],started:Date.now()};report.phases.push(phase);};
 const end=async()=>{await Promise.all(jobs);phase.elapsedMs=Date.now()-phase.started;phase.totalBytes=Object.values(phase.bytes).reduce((a,b)=>a+b,0);delete phase.started;fs.writeFileSync('docs/region-loading-measurements.json',JSON.stringify(report,null,2)+'\n');};
 start('cold regional overview');await page.goto(base+'?place=all');await ready();await end();
 assert(!phase.urls.some(u=>/\/live\/(trails|facilities|forest-instances)|resort-scene/.test(u)));
 await page.locator('mratkino-map').evaluate(el=>{el.map.qaIdentity='one-map';});
 await page.screenshot({path:'renders/region-overview.png',fullPage:true});
 for(const id of ['beloretsk','yalangas','mratkino']){
  start('move to '+id);await page.locator('.place-select').selectOption(id);await ready();await end();assert.equal(await page.locator('mratkino-map').evaluate(el=>el.map.qaIdentity),'one-map');
  await page.screenshot({path:`renders/region-${id}.png`,fullPage:true});
 }
 start('enable detailed scene');await page.locator('[data-action=life]').click();await page.waitForFunction(()=>document.querySelector('mratkino-map').lifeScene?.stats.frames>0,null,{timeout:60000});await end();
 const scene=await page.locator('mratkino-map').evaluate(el=>({trees:el.lifeScene.stats.trees,clusters:el.lifeScene.stats.canopyClusters,riders:el.lifeScene.stats.riders,paths:el.lifeScene.riderRoutes.map(r=>({name:r.feature.properties.name,length:r.length})),triangleCount:el.lifeScene.renderer.info.render.triangles}));report.scene=scene;assert.equal(scene.riders,24);assert.equal(scene.paths.length,6);assert(scene.paths.every(r=>r.length>0));
 await page.screenshot({path:'renders/region-living.png',fullPage:true,timeout:90000});
 await page.locator('mratkino-map').evaluate(el=>{window.qaOldScene=el.lifeScene;});await page.locator('.place-select').selectOption('all');await ready();assert(await page.evaluate(()=>window.qaOldScene.disposed));assert.equal(await page.locator('mratkino-map').evaluate(el=>el.lifeScene),null);report.sceneCleanup='passed';
 assert.deepEqual(report.errors,[]);
 await page.unrouteAll({behavior:'ignoreErrors'});fs.writeFileSync('docs/region-loading-measurements.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,phases:report.phases.map(({urls,...p})=>p)},null,2));
}finally{await browser.close()}
