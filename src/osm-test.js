// OpenStreetMap comparison page. The map library is bundled and served with the site (no external CDN),
// the same way as the 3D map, so it loads wherever the 3D map loads.
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerURL from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
maplibregl.setWorkerUrl(workerURL);
window.__osmTest={get map(){return map;},ready:false,errors:[]};
// Data comes from the same published files as the site map; nothing here is a separate copy.
const DATA={places:'integration/map-catalog.json',routes:'integration/route-catalog.json',lines:'region/directions/routes-display.geojson'};
const GLYPHS='https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const DEM={type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],tileSize:512,encoding:'terrarium',maxzoom:12,attribution:'<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn</a>'};
const BASES={
 liberty:'https://tiles.openfreemap.org/styles/liberty',
 topo:{version:8,glyphs:GLYPHS,sources:{otm:{type:'raster',tiles:['a','b','c'].map(s=>`https://${s}.tile.opentopomap.org/{z}/{x}/{y}.png`),tileSize:256,maxzoom:17,attribution:'Карта: © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA), данные © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">участники OpenStreetMap</a>'}},layers:[{id:'otm',type:'raster',source:'otm'}]}
};
const RANK={narrowGauge2:3,waterTower:3,malinovaya:3,mratkino:2,abzakovo:2,bannoye:2};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km=m=>(m/1000).toLocaleString('ru-RU',{maximumFractionDigits:1});
let places=[],routes=[],lines=null,view='places',base='liberty',selectedRoute=null,selectedPlace=null;
const card=document.getElementById('card');

// Base styles are fetched once and our layers are added on top, so switching bases keeps places and routes.
const styleCache={};
const baseStyle=name=>typeof BASES[name]==='string'?(styleCache[name]||=fetch(BASES[name]).then(r=>{if(!r.ok)throw Error('Подложка не загрузилась');return r.json();})):Promise.resolve(BASES[name]);
const map=new maplibregl.Map({container:'map',style:{version:8,glyphs:GLYPHS,sources:{},layers:[{id:'bg',type:'background',paint:{'background-color':'#eef0e8'}}]},center:[58.4,53.97],zoom:8.6,attributionControl:{compact:true}});
baseStyle('liberty').then(st=>map.setStyle(overlay(st),{diff:false})).catch(e=>window.__osmTest.errors.push(String(e)));
map.on('error',e=>window.__osmTest.errors.push(String(e.error?.message||e.error||e)));
map.addControl(new maplibregl.NavigationControl({visualizePitch:false}),'top-left');
map.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:false}),'top-left');
map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-right');

function placeFeatures(){
 return {type:'FeatureCollection',features:places.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.coords[1],p.coords[0]]},properties:{id:p.id,name:p.name,group:p.kind==='stamp-point'?'stamp':p.neighbor?'neighbor':'place',passport:!!p.sellsPassports,rank:RANK[p.id]||0}}))};
}
// Adds relief, routes and places on top of whichever base style is active.
function overlay(style){
 style=JSON.parse(JSON.stringify(style));
 style.glyphs=style.glyphs||GLYPHS;
 const firstSymbol=style.layers.findIndex(l=>l.type==='symbol');
 if(base==='liberty'){
  style.sources.vbDem=DEM;
  const hill={id:'vb-hillshade',type:'hillshade',source:'vbDem',paint:{'hillshade-exaggeration':.35,'hillshade-shadow-color':'#5e6f66','hillshade-highlight-color':'#ffffff','hillshade-accent-color':'#8a988f'}};
  style.layers.splice(firstSymbol<0?style.layers.length:firstSymbol,0,hill);
 }
 style.sources.vbLines={type:'geojson',data:lines||{type:'FeatureCollection',features:[]}};
 style.sources.vbPlaces={type:'geojson',data:placeFeatures()};
 const off=['interpolate',['linear'],['zoom'],11.5,0,13.5,['coalesce',['get','renderOffset'],0]];
 const sel=['==',['get','routeId'],selectedRoute||''];
 style.layers.push(
  {id:'vb-route-casing',type:'line',source:'vbLines',layout:{'line-cap':'round','line-join':'round','visibility':view==='places'?'visible':'none'},paint:{'line-offset':off,'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],9,2,14,5],'line-opacity':selectedRoute?['case',sel,1,.25]:.85}},
  {id:'vb-route-line',type:'line',source:'vbLines',layout:{'line-cap':'round','line-join':'round','line-sort-key':['case',sel,2,1],'visibility':view==='places'?'visible':'none'},paint:{'line-offset':off,'line-color':['coalesce',['get','color'],'#c0582f'],'line-width':['interpolate',['linear'],['zoom'],9,['case',sel,3.5,1.4],14,['case',sel,5.5,3]],'line-opacity':selectedRoute?['case',sel,1,.3]:['interpolate',['linear'],['zoom'],9,.65,14,.9]}},
  {id:'vb-place-dot',type:'circle',source:'vbPlaces',filter:visibleFilter(),paint:{'circle-radius':['interpolate',['linear'],['zoom'],8,['match',['get','group'],'neighbor',4,'stamp',5.5,5],14,['match',['get','group'],'neighbor',5,'stamp',7.5,8]],'circle-color':['match',['get','group'],'stamp','#9a7426','neighbor','#8b9a91','#193c30'],'circle-stroke-color':'#ffffff','circle-stroke-width':2}},
  {id:'vb-place-label',type:'symbol',source:'vbPlaces',filter:visibleFilter(),layout:{'text-field':['get','name'],'text-font':['Noto Sans Bold'],'text-size':['interpolate',['linear'],['zoom'],8,['match',['get','group'],'neighbor',10.5,12],14,['match',['get','group'],'neighbor',12,14]],'text-offset':[0,1.05],'text-anchor':'top','text-max-width':9,'symbol-sort-key':['-',10,['get','rank']],'text-optional':true},paint:{'text-color':['match',['get','group'],'stamp','#6b4f15','neighbor','#5d6b63','#193c30'],'text-halo-color':'#ffffff','text-halo-width':1.6}}
 );
 return style;
}
function visibleFilter(){
 if(view==='places')return ['!=',['get','group'],'stamp'];
 if(view==='passport')return ['all',['==',['get','group'],'stamp'],['==',['get','passport'],true]];
 return ['==',['get','group'],'stamp'];
}
function refresh(){
 if(!map.getLayer('vb-place-dot'))return;
 for(const id of ['vb-place-dot','vb-place-label'])map.setFilter(id,visibleFilter());
 for(const id of ['vb-route-casing','vb-route-line'])map.setLayoutProperty(id,'visibility',view==='places'?'visible':'none');
 const sel=['==',['get','routeId'],selectedRoute||''];
 map.setPaintProperty('vb-route-line','line-opacity',selectedRoute?['case',sel,1,.3]:['interpolate',['linear'],['zoom'],9,.65,14,.9]);
 map.setPaintProperty('vb-route-casing','line-opacity',selectedRoute?['case',sel,1,.25]:.85);
 map.setPaintProperty('vb-route-line','line-width',['interpolate',['linear'],['zoom'],9,['case',sel,3.5,1.4],14,['case',sel,5.5,3]]);
 map.setLayoutProperty('vb-route-line','line-sort-key',['case',sel,2,1]);
}
function fitTo(coords,maxZoom){
 if(!coords.length)return;
 const b=coords.reduce((b,c)=>b.extend(c),new maplibregl.LngLatBounds(coords[0],coords[0]));
 const mobile=innerWidth<=640,pad=mobile?{top:30,left:30,right:30,bottom:Math.round(innerHeight*.45)}:{top:40,left:40,bottom:40,right:card.classList.contains('open')?420:40};
 map.fitBounds(b,{padding:pad,maxZoom:maxZoom||14,duration:700});
}
function overview(){
 const pts=places.filter(p=>view==='places'?p.kind!=='stamp-point'&&!p.neighbor:p.kind==='stamp-point'&&(view!=='passport'||p.sellsPassports)).map(p=>[p.coords[1],p.coords[0]]);
 fitTo(pts,view==='places'?11:15);
}
function routesFor(p){return routes.filter(r=>r.hasGeometry&&(r.mapPlaceId===p.canonicalId||r.placeId===p.canonicalId));}
function stampPointsFor(p){return places.filter(k=>k.kind==='stamp-point'&&(k.stamps||[]).some(s=>s.locationId===p.id||s.locationId===p.canonicalId));}
function wayLink(p){return `https://yandex.ru/maps/?rtext=~${p.coords[0]},${p.coords[1]}&rtt=auto`;}
function showPlace(id,fly=true){
 const p=places.find(x=>x.id===id);if(!p)return;
 selectedPlace=p;selectedRoute=null;refresh();
 const photo=p.photos?.[0];const rs=routesFor(p),ks=stampPointsFor(p);
 card.innerHTML=`<button class="x" type="button" aria-label="Закрыть">×</button>${photo?`<img src="${esc(photo.src)}" alt="${esc(photo.alt||p.name)}" loading="lazy">`:''}<div class="body">
 <div class="type">${esc(p.neighbor?'Соседний курорт · ≈ '+p.distanceKm+' км от Белорецка':p.type)}</div><h2>${esc(p.name)}</h2><p>${esc(p.desc)}</p>
 ${p.passportInfo?`<p><b>${esc(p.passportInfo)}</b></p>`:''}
 <div class="acts">${p.url?`<a class="btn main" href="${esc(p.url)}">О месте →</a>`:''}<a class="btn" href="${wayLink(p)}" target="_blank" rel="noopener">Как добраться</a></div>
 ${rs.length?`<div class="sec"><h3>Пешие маршруты</h3><div class="list">${rs.map(r=>`<button type="button" data-route="${esc(r.id)}">${esc(r.title)}<small>≈ ${km(r.lineDistanceM||r.distanceM/2)} км в одну сторону</small></button>`).join('')}</div></div>`:''}
 ${ks.length?`<div class="sec stamps"><h3>Где поставить штамп</h3><div class="list">${ks.map(k=>`<button type="button" data-place="${esc(k.id)}">${esc(k.name)}</button>`).join('')}</div></div>`:''}
 ${p.kind==='stamp-point'&&p.stamps?.length?`<div class="sec stamps"><h3>Штампы здесь</h3><p>${p.stamps.map(s=>esc(s.name)).join(' · ')}</p></div>`:''}
 </div>`;
 card.classList.add('open');card.scrollTop=0;
 if(fly)map.flyTo({center:[p.coords[1],p.coords[0]],zoom:Math.min(p.zoom||13,14),padding:innerWidth<=640?{bottom:Math.round(innerHeight*.45)}:{right:400},duration:800});
}
function showRoute(id){
 const r=routes.find(x=>x.id===id);if(!r)return;
 selectedRoute=id;refresh();
 card.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.route===id)));
 let old=card.querySelector('.route-info');if(old)old.remove();
 const box=document.createElement('div');box.className='sec route-info';
 const trip=r.tripType==='out_and_back'?'туда и обратно':r.tripType==='loop'?'кольцо':'в одну сторону';
 box.innerHTML=`<h3>${esc(r.title)}</h3><p>${esc(r.description||'')}</p><p><b>≈ ${km(r.distanceM)} км</b> ${trip}${r.buildStatus!=='ready'?' · маршрут неполный':''}</p>${r.sourceUrl?`<p><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">Описание маршрута ↗</a></p>`:''}`;
 (card.querySelector('[data-route="'+CSS.escape(id)+'"]')?.closest('.sec')||card.querySelector('.body')).after(box);
 const coords=(lines?.features||[]).filter(f=>f.properties.routeId===id).flatMap(f=>f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.coordinates.flat());
 fitTo(coords.map(c=>[c[0],c[1]]),15);
}
function closeCard(){card.classList.remove('open');card.innerHTML='';selectedRoute=null;selectedPlace=null;refresh();}

card.addEventListener('click',e=>{
 if(e.target.closest('.x')){closeCard();return;}
 const r=e.target.closest('[data-route]');if(r){showRoute(r.dataset.route);return;}
 const k=e.target.closest('[data-place]');if(k){setView('stamps',false);showPlace(k.dataset.place);}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&card.classList.contains('open'))closeCard();});
function setView(v,fit=true){view=v;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));selectedRoute=null;refresh();if(fit){closeCard();overview();}}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-base]').forEach(b=>b.addEventListener('click',()=>{
 if(b.dataset.base===base)return;base=b.dataset.base;
 document.querySelectorAll('[data-base]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 baseStyle(base).then(st=>map.setStyle(overlay(st),{diff:false}));
}));
for(const layer of ['vb-place-dot','vb-place-label']){
 map.on('click',layer,e=>{const f=e.features?.[0];if(f)showPlace(f.properties.id);});
 map.on('mouseenter',layer,()=>map.getCanvas().style.cursor='pointer');
 map.on('mouseleave',layer,()=>map.getCanvas().style.cursor='');
}
map.on('click','vb-route-line',e=>{
 if(map.queryRenderedFeatures(e.point,{layers:['vb-place-dot']}).length)return;
 const id=e.features?.[0]?.properties.routeId;const r=routes.find(x=>x.id===id);if(!r)return;
 const p=places.find(x=>x.canonicalId===r.mapPlaceId||x.canonicalId===r.placeId);
 if(p)showPlace(p.id,false);showRoute(id);
});
map.on('mouseenter','vb-route-line',()=>map.getCanvas().style.cursor='pointer');
map.on('mouseleave','vb-route-line',()=>map.getCanvas().style.cursor='');

Promise.all(Object.values(DATA).map(u=>fetch(u).then(r=>{if(!r.ok)throw Error(u);return r.json();}))).then(([p,r,l])=>{
 places=p;routes=(r.routes||[]).filter(x=>x.status);lines=l;
 const apply=()=>{map.getSource('vbPlaces')?.setData(placeFeatures());map.getSource('vbLines')?.setData(lines);overview();
  const q=new URLSearchParams(location.search).get('placeId');if(q&&places.some(x=>x.id===q||x.canonicalId===q))showPlace((places.find(x=>x.id===q)||places.find(x=>x.canonicalId===q)).id);};
 const wait=()=>map.getSource('vbPlaces')&&map.getSource('vbLines')?(apply(),window.__osmTest.ready=true):setTimeout(wait,150);wait();
}).catch(err=>{card.innerHTML='<div class="body"><h2>Не удалось загрузить данные карты</h2><p>'+esc(err.message)+'</p></div>';card.classList.add('open');});
