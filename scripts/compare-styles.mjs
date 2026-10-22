import {chromium} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{const page=await browser.newPage({viewport:{width:1440,height:1050}});await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelector('mratkino-map').getAttribute('data-map-state')==='ready',{timeout:60000});
await page.waitForFunction(()=>{const m=document.querySelector('mratkino-map').map;return !m.isMoving()&&m.areTilesLoaded()});
const results=[];
for(const method of ['standard','basic','igor']){
 await page.evaluate(method=>{const m=document.querySelector('mratkino-map').map;m.setPaintProperty('hillshade','hillshade-method',method);m.setPaintProperty('hillshade','hillshade-exaggeration',.75);m.setPaintProperty('hillshade','hillshade-illumination-altitude',40);},method);
 await page.waitForTimeout(750);await page.screenshot({path:`renders/style-${method}.png`,fullPage:true});
 const ms=await page.evaluate(()=>new Promise(resolve=>{let last=performance.now(),frames=[];const frame=now=>{frames.push(now-last);last=now;if(frames.length===30)resolve(frames.sort((a,b)=>a-b)[15]);else {document.querySelector('mratkino-map').map.triggerRepaint();requestAnimationFrame(frame)}};requestAnimationFrame(frame)}));results.push({method,medianFrameMs:ms});
}
fs.writeFileSync('renders/style-comparison.json',JSON.stringify({environment:'Chromium software WebGL, same loaded camera; not physical-device FPS',results},null,2));
}finally{await browser.close()}
