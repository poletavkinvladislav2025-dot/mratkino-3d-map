// Renders the OpenStreetMap comparison page in headless Chromium with real tiles and saves screenshots.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out='osm-check';fs.mkdirSync(out,{recursive:true});
const base=process.env.OSM_TEST_URL||'http://127.0.0.1:4173/osm-test.html';
const report={url:base,runs:[]};
// Screenshots are also printed as small JPEGs into the job log (artifact storage may be unreachable for the reviewer).
async function shot(page,file){await page.screenshot({path:file});const b=await page.screenshot({type:'jpeg',quality:55});console.log('SHOT '+file.split('/').pop().replace('.png','')+' '+b.toString('base64'));}
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
 await shot(page,`${out}/${name}-1-overview.png`);
 run.state=await page.evaluate(()=>{const t=window.__osmTest||{},m=t.map;const st=(()=>{try{return m?.getStyle();}catch(e){return 'getStyle error '+e;}})();let q=null;try{q={places:m.queryRenderedFeatures({layers:['vb-place-dot']}).length,routes:m.queryRenderedFeatures({layers:['vb-route-line']}).length};}catch(e){q=String(e);}return {hasTest:!!window.__osmTest,hasMap:!!m,ready:t.ready,errors:t.errors,styleType:typeof st,layers:st?.layers?.length,ours:st?.layers?.filter?.(l=>l.id.startsWith('vb')).map(l=>l.id),loaded:m?.loaded?.(),styleLoaded:m?.isStyleLoaded?.(),zoom:m?.getZoom?.(),q,webgl:!!document.createElement('canvas').getContext('webgl2'),canvas:!!document.querySelector('.maplibregl-canvas')};}).catch(e=>({evalError:String(e)}));
 if(!run.state?.layers){report.fatal=true;await page.close();continue;}
 run.placeClicked=await clickPlace(page,'bigIremel');
 run.card=await page.evaluate(()=>document.querySelector('#card h2')?.textContent||null);
 await settle(page,'place');await shot(page,`${out}/${name}-2-iremel-card.png`);
 const rb=page.locator('#card [data-route]').first();
 if(await rb.count()){await rb.click();await settle(page,'route');run.route=await page.evaluate(()=>document.querySelector('.route-info h3')?.textContent);await shot(page,`${out}/${name}-3-route.png`);}
 if(name==='desktop'){
  await page.evaluate(()=>window.__osmTest.map.jumpTo({center:[58.3465,53.9815],zoom:14.5}));await page.locator('#card .x').click().catch(()=>{});
  await settle(page,'town');await shot(page,`${out}/${name}-4-malinovaya-trails.png`);
  await page.locator('[data-base=topo]').click();await page.waitForTimeout(800);await settle(page,'topo');
  run.topo=await page.evaluate(()=>({ours:window.__osmTest.map.getStyle().layers.filter(l=>l.id.startsWith('vb')).length}));
  await shot(page,`${out}/${name}-5-topo.png`);
  await page.locator('[data-base=liberty]').click();await page.waitForTimeout(800);
  await page.evaluate(()=>window.__osmTest.map.jumpTo({center:[58.405,53.968],zoom:15.5}));await settle(page,'city');await shot(page,`${out}/${name}-6-beloretsk.png`);
 }
 await page.close();
}
}catch(e){report.crash=String(e).slice(0,500);}

// The site's Tilda block on another origin (like visitbeloretsk.ru loading from GitHub Pages).
fs.mkdirSync('harness',{recursive:true});
fs.writeFileSync('harness/index.html','<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tilda block check</title></head><body style="margin:0;background:#faf8f5;font-family:Arial"><div id="allrecords"><div class="t-rec" id="rec1"><div class="t123"><script src="http://127.0.0.1:4173/integration/tilda-map-block.js?v=check" data-default-mode="yandex" defer></script></div></div></div></body></html>');
const blockState=page=>page.evaluate(()=>{const h=document.querySelector('.vb-map-complete'),s=h?.shadowRoot,c=s?.querySelector('#vbT1MapContainer');return {host:!!h,background:c?.dataset.backgroundState,markers:s?.querySelectorAll('.vb-osm-pm').length,canvas:!!s?.querySelector('.maplibregl-canvas'),recovery:s?.querySelector('.vb-yandex-recovery')&&!s.querySelector('.vb-yandex-recovery').hidden?s.querySelector('.vb-yandex-recovery').innerText.slice(0,120):null,toolbar:!!s?.querySelector('.vb-map-toolbar'),stats:s?.querySelector('.vb-map-stats')?.textContent,api:!!s?.VisitBeloretskYandex};});
try{
for(const [name,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
 const page=await browser.newPage({viewport,deviceScaleFactor:1});const run={name:'block-'+name,console:[],failed:[],statuses:{}};report.runs.push(run);
 page.on('console',m=>{if(['error','warning'].includes(m.type()))run.console.push(m.type()+': '+m.text().slice(0,300));});
 page.on('pageerror',e=>run.console.push('pageerror: '+String(e).slice(0,300)));
 page.on('requestfailed',r=>run.failed.push(r.url().slice(0,120)+' '+r.failure()?.errorText));
 page.on('response',r=>{const k=new URL(r.url()).host+' '+r.status();run.statuses[k]=(run.statuses[k]||0)+1;});
 await page.goto('http://localhost:4174/index.html',{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>{const c=document.querySelector('.vb-map-complete')?.shadowRoot?.querySelector('#vbT1MapContainer');return c&&['ready','error'].includes(c.dataset.backgroundState);},null,{timeout:60000,polling:500}).catch(()=>{});
 await page.waitForTimeout(2500);run.state=await blockState(page);
 await page.locator('.vb-map-complete').scrollIntoViewIfNeeded().catch(()=>{});await shot(page,`${out}/block-${name}-1.png`);
 run.place=await page.evaluate(async()=>{const s=document.querySelector('.vb-map-complete').shadowRoot;s.VisitBeloretskYandex.openPlace('bigIremel');await new Promise(r=>setTimeout(r,3500));const b=[...s.querySelectorAll('.vb-t1__panel-body,.vb-t1__mcard-body')].find(x=>x.textContent.trim());return b?.innerText.replace(/\s+/g,' ').slice(0,160)||null;}).catch(e=>'error '+e);
 await shot(page,`${out}/block-${name}-2-place.png`);
 run.route=await page.evaluate(async()=>{const s=document.querySelector('.vb-map-complete').shadowRoot;await s.VisitBeloretskYandex.openRoute('iremel-upper');await new Promise(r=>setTimeout(r,3500));return s.querySelector('.vb-route-detail')?.innerText.replace(/\s+/g,' ').slice(0,140)||'(no detail)';}).catch(e=>'error '+e);
 await shot(page,`${out}/block-${name}-3-route.png`);
 if(name==='desktop'){run.mode3d=await page.evaluate(async()=>{const s=document.querySelector('.vb-map-complete').shadowRoot;const b=[...s.querySelectorAll('#vb-map-modes .vb-mode-group button')][1];b?.click();await new Promise(r=>setTimeout(r,1500));const f=s.querySelector('iframe');return {mode:s.getElementById('vb-map-modes')?.dataset.mode,iframe:!!f};}).catch(e=>'error '+e);}
 await page.close();
}
}catch(e){report.blockCrash=String(e).slice(0,500);}

// The live site page (visitbeloretsk.ru/map) as visitors see it.
try{
for(const [name,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
 const page=await browser.newPage({viewport,deviceScaleFactor:1});const run={name:'live-'+name,console:[],failed:[],statuses:{}};report.runs.push(run);
 page.on('console',m=>{if(m.type()==='error')run.console.push(m.text().slice(0,300));});
 page.on('pageerror',e=>run.console.push('pageerror: '+String(e).slice(0,300)));
 page.on('response',r=>{const k=new URL(r.url()).host+' '+r.status();run.statuses[k]=(run.statuses[k]||0)+1;});
 await page.goto('https://visitbeloretsk.ru/map',{waitUntil:'load',timeout:90000});
 await page.waitForFunction(()=>{const c=document.querySelector('.vb-map-complete')?.shadowRoot?.querySelector('#vbT1MapContainer');return c&&['ready','error'].includes(c.dataset.backgroundState);},null,{timeout:60000,polling:500}).catch(()=>{});
 await page.waitForTimeout(3000);run.state=await blockState(page);run.yandexRequests=Object.keys(run.statuses).filter(k=>/api-maps\.yandex|core-renderer-tiles/.test(k));
 await page.locator('.vb-map-complete').scrollIntoViewIfNeeded().catch(()=>{});await shot(page,`${out}/live-${name}-1.png`);
 run.place=await page.evaluate(async()=>{const s=document.querySelector('.vb-map-complete').shadowRoot;s.VisitBeloretskYandex.openPlace('malinovaya1');await new Promise(r=>setTimeout(r,3500));const b=[...s.querySelectorAll('.vb-t1__panel-body,.vb-t1__mcard-body')].find(x=>x.textContent.trim());return b?.innerText.replace(/\s+/g,' ').slice(0,120)||null;}).catch(e=>'error '+e);
 await shot(page,`${out}/live-${name}-2-place.png`);await page.close();
}
}catch(e){report.liveCrash=String(e).slice(0,500);}
await browser.close();
fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
console.log(JSON.stringify(report,null,1));
