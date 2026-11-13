// Renders the OpenStreetMap comparison page in headless Chromium with real tiles and saves screenshots.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out='osm-check';fs.mkdirSync(out,{recursive:true});
const base=process.env.OSM_TEST_URL||'http://127.0.0.1:4173/osm-test.html';
const report={url:base,runs:[]};
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
async function settle(page,label){
 const t0=Date.now();
 await page.waitForFunction(()=>window.__osmTest?.ready,null,{timeout:60000}).catch(()=>{});
 await page.waitForFunction(()=>{const m=window.__osmTest?.map;return m&&m.loaded()&&m.areTilesLoaded();},null,{timeout:60000,polling:500}).catch(()=>{});
 await page.waitForTimeout(1200);
 return {label,ms:Date.now()-t0};
}
async function clickPlace(page,id){
 const pt=await page.evaluate(id=>{const m=window.__osmTest.map;const f=m.getSource('vbPlaces')._data?.features?.find(f=>f.properties.id===id)||null;const c=f?f.geometry.coordinates:null;if(!c)return null;m.jumpTo({center:c,zoom:12});return true;},id);
 if(!pt)return false;await page.waitForTimeout(1500);
 const xy=await page.evaluate(id=>{const m=window.__osmTest.map;const f=m.queryRenderedFeatures({layers:['vb-place-dot']}).find(f=>f.properties.id===id);if(!f)return null;const p=m.project(f.geometry.coordinates);const r=m.getCanvas().getBoundingClientRect();return [r.left+p.x,r.top+p.y];},id);
 if(!xy)return false;await page.mouse.click(xy[0],xy[1]);await page.waitForTimeout(1500);return true;
}
try{
for(const [name,viewport] of [['desktop',{width:1280,height:850}],['mobile',{width:390,height:844}]]){
 const page=await browser.newPage({viewport,deviceScaleFactor:1});
 const run={name,console:[],failed:[],statuses:{}};report.runs.push(run);
 page.on('console',m=>{if(['error','warning'].includes(m.type()))run.console.push(m.type()+': '+m.text().slice(0,300));});
 page.on('pageerror',e=>run.console.push('pageerror: '+String(e).slice(0,300)));
 page.on('requestfailed',r=>run.failed.push(new URL(r.url()).host+' '+r.failure()?.errorText));
 page.on('response',r=>{const h=new URL(r.url()).host;const k=h+' '+r.status();run.statuses[k]=(run.statuses[k]||0)+1;});
 await page.goto(base,{waitUntil:'load',timeout:60000});
 run.overview=await settle(page,'overview');
 await page.screenshot({path:`${out}/${name}-1-overview.png`});
 run.state=await page.evaluate(()=>{const t=window.__osmTest||{},m=t.map;const st=(()=>{try{return m?.getStyle();}catch(e){return 'getStyle error '+e;}})();let q=null;try{q={places:m.queryRenderedFeatures({layers:['vb-place-dot']}).length,routes:m.queryRenderedFeatures({layers:['vb-route-line']}).length};}catch(e){q=String(e);}return {hasTest:!!window.__osmTest,hasMap:!!m,ready:t.ready,errors:t.errors,styleType:typeof st,layers:st?.layers?.length,ours:st?.layers?.filter?.(l=>l.id.startsWith('vb')).map(l=>l.id),loaded:m?.loaded?.(),styleLoaded:m?.isStyleLoaded?.(),zoom:m?.getZoom?.(),q,webgl:!!document.createElement('canvas').getContext('webgl2'),canvas:!!document.querySelector('.maplibregl-canvas')};}).catch(e=>({evalError:String(e)}));
 if(!run.state?.layers){report.fatal=true;await page.close();continue;}
 run.placeClicked=await clickPlace(page,'bigIremel');
 run.card=await page.evaluate(()=>document.querySelector('#card h2')?.textContent||null);
 await settle(page,'place');await page.screenshot({path:`${out}/${name}-2-iremel-card.png`});
 const rb=page.locator('#card [data-route]').first();
 if(await rb.count()){await rb.click();await settle(page,'route');run.route=await page.evaluate(()=>document.querySelector('.route-info h3')?.textContent);await page.screenshot({path:`${out}/${name}-3-route.png`});}
 if(name==='desktop'){
  await page.evaluate(()=>window.__osmTest.map.jumpTo({center:[58.3465,53.9815],zoom:14.5}));await page.locator('#card .x').click().catch(()=>{});
  await settle(page,'town');await page.screenshot({path:`${out}/${name}-4-malinovaya-trails.png`});
  await page.locator('[data-base=topo]').click();await page.waitForTimeout(800);await settle(page,'topo');
  run.topo=await page.evaluate(()=>({ours:window.__osmTest.map.getStyle().layers.filter(l=>l.id.startsWith('vb')).length}));
  await page.screenshot({path:`${out}/${name}-5-topo.png`});
  await page.locator('[data-base=liberty]').click();await page.waitForTimeout(800);
  await page.evaluate(()=>window.__osmTest.map.jumpTo({center:[58.405,53.968],zoom:15.5}));await settle(page,'city');await page.screenshot({path:`${out}/${name}-6-beloretsk.png`});
 }
 await page.close();
}
}catch(e){report.crash=String(e).slice(0,500);}
await browser.close();
fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
console.log(JSON.stringify(report,null,1));
