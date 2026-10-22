import workerURL from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import mapCSS from 'maplibre-gl/dist/maplibre-gl.css?inline';
import componentCSS from './component.css?inline';
import { SUMMIT, EXPECTED, boundsFor, coordinates, slopeCamera, createStyle } from './map-data.js';

const offlinePools=new Map();let sequence=0,protocolRegistered=false,offlineWorkerURL=null;
const template=`
<div class="shell">
 <header class="head"><div><p class="eyebrow">БЕЛОРЕЦК · ЮЖНЫЙ УРАЛ</p><div class="title-line"><h1>Мраткино</h1><p>Интерактивная карта трасс</p></div></div><span class="brand"><span>visit</span>beloretsk</span></header>
 <div class="toolbar"><div class="views" role="group" aria-label="Положение камеры"><button type="button" data-view="south" aria-pressed="true">Южный склон</button><button type="button" data-view="north" aria-pressed="false">Северный склон</button><button type="button" data-view="overview" aria-pressed="false">Общий вид</button></div><div class="toolbar-right"><span class="verified-label">ОТКРЫТЫЕ ДАННЫЕ · НЕ СВЕРЕНО КУРОРТОМ</span><button type="button" class="data-button" data-action="sources">ⓘ О данных</button></div></div>
 <div class="workspace"><div class="map-wrap"><div class="map" aria-label="Вращающаяся трёхмерная карта Мраткино"></div><div class="map-label"><span>МРАТКИНО / <b class="view-label">ЮЖНЫЙ СКЛОН</b></span><small>Copernicus DEM · высоты 1:1<br>Линии OSM · актуальность требует сверки</small></div><button class="mode-button" type="button" data-action="mode" aria-pressed="false" aria-label="Включить плоский вид">2D</button><div class="hint">Вращайте и приближайте карту<br>Правая кнопка мыши · на телефоне — два пальца</div><div class="error-note" role="status" hidden></div><div class="loading" role="status"><span class="spinner" aria-hidden="true"></span><p>Готовим настоящий рельеф Мраткино…</p></div><div class="fallback" hidden><img alt="Резервный статичный ракурс реального рельефа Мраткино"/><p></p><button type="button" data-action="retry">Повторить загрузку 3D-карты</button></div></div>
 <aside class="sidebar"><button type="button" class="mobile-panel-toggle" aria-expanded="false"><span>Трассы и слои</span><span class="panel-summary">Открыть ↑</span></button><div class="panel-body"><div class="panel-head"><h2>Трассы</h2><span class="trail-count">05</span></div><p class="panel-sub">Южный склон · геометрия OpenStreetMap</p><div class="trail-list"></div><section class="card" aria-live="polite"><span class="tiny">ПОЗНАКОМЬТЕСЬ С ГОРOЙ</span><h3>Выберите трассу</h3><p>Нажмите на линию, подпись или название в списке.</p></section><div class="layers"><h3>Слои карты</h3><label><span><i class="layer-symbol lift-symbol"></i>Подъёмники <small class="lift-count"></small></span><input type="checkbox" role="switch" data-layer="lifts" checked/></label><label><span><i class="layer-symbol contour-symbol"></i>Горизонтали · 25 м</span><input type="checkbox" role="switch" data-layer="contours"/></label><label><span><i class="layer-symbol facility-symbol"></i>Инфраструктура</span><input type="checkbox" role="switch" data-layer="facilities" checked/></label><label><span><i class="layer-symbol forest-symbol"></i>Лес по OSM</span><input type="checkbox" role="switch" data-layer="forest" checked/></label><p class="legend"><i></i> Цвет выделения не означает сложность.<br>Фиолетовый пунктир — подъёмники.</p></div></div></aside></div>
 <footer class="foot"><span><i class="dot"></i><span class="data-summary">Загружаем геоданные…</span></span><button type="button" data-action="sources">Источники и точность ↗</button></footer>
</div>
<dialog class="dialog"><header><p class="eyebrow">ГЕОГРАФИЯ И ПРОИСХОЖДЕНИЕ</p><button type="button" data-action="close-dialog" aria-label="Закрыть">×</button></header><h2>Реальная гора.<br>Проверяемые источники.</h2><p>Рельеф — Copernicus DEM GLO-30, около 30 м, высоты EGM2008. Преувеличение равно 1. Тени и зимние цвета — оформление, а не сведения о текущем снежном покрове.</p><h3>Трассы и подъёмники</h3><p class="source-counts"></p><p>Линии, полигоны спусков, лес, дороги и объекты взяты из OpenStreetMap. Это данные сообщества, а не подтверждение курортом. Работа подъёмников и открытие трасс в реальном времени не отображаются.</p><ul><li>Ю5 в выгрузке не найден, линия не нарисована.</li><li>У объекта «Ю3» противоречие: ref=Ю2. Он отмечен для сверки.</li><li>Длина по линии OSM — вычисление по геометрии, а не паспортная длина трассы. Сложность и перепад требуют уточнения.</li></ul><h3>О модели и управлении</h3><p>Высотные PNG-тайлы Terrarium подготовлены из двух исходных Copernicus GeoTIFF и поставляются с картой. Камеры склонов рассчитаны по линиям трасс и направлению от их нижних концов к вершине OSM. Никаких автоматических маршрутов или случайных масок леса.</p><p>Мышь: перетаскивание — перемещение; правая кнопка или Ctrl + перетаскивание — поворот и наклон; колесо с Ctrl — масштаб. На телефоне — два пальца; одним пальцем можно прокручивать страницу. На клавиатуре: +/−, стрелки; Shift + стрелки — наклон и поворот. В полноэкранном режиме кооперативное управление временно отключается движком.</p><h3>Атрибуция</h3><p>© OpenStreetMap contributors, ODbL 1.0.<br>Copernicus DEM: © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.<br>MapLibre GL JS — BSD-3-Clause.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Условия OpenStreetMap ↗</a></dialog>`;

class MratkinoMap extends HTMLElement {
 connectedCallback(){
  if(this.started)return;this.started=true;this.token=(this.token||0)+1;this.uid=String(++sequence);this.view='south';this.selected=null;this.mode2D=false;this.markers=[];
  this.controller=new AbortController();this.abort=this.controller.signal;
  const shadow=this.shadowRoot||this.attachShadow({mode:'open'});shadow.innerHTML=`<style>${mapCSS}\n${componentCSS}</style>${template}`;
  this.$=selector=>shadow.querySelector(selector);this.$$=selector=>[...shadow.querySelectorAll(selector)];
  const pageBase=/^(https?:|file:)/.test(document.baseURI)?document.baseURI:'https://mratkino.invalid/';
  this.assetBase=new URL(this.getAttribute('asset-base')||'./',pageBase);
  this.bindUI();this.renderList();
  this.observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){this.observer.disconnect();this.init(this.token);}}, {rootMargin:'250px'});this.observer.observe(this);
 }
 disconnectedCallback(){this.started=false;this.token++;this.controller?.abort();this.observer?.disconnect();this.resizeObserver?.disconnect();clearTimeout(this.readyTimer);clearTimeout(this.hintTimer);this.map?.remove();this.map=null;offlinePools.delete(this.uid);}
 url(path){return new URL(path,this.assetBase).href;}
 bindUI(){
  this.$$('[data-view]').forEach(b=>b.addEventListener('click',()=>this.chooseView(b.dataset.view)));
  this.$$('[data-action=sources]').forEach(b=>b.addEventListener('click',()=>this.$('dialog').showModal()));
  this.$('[data-action=close-dialog]').addEventListener('click',()=>this.$('dialog').close());
  this.$('dialog').addEventListener('click',e=>{const r=this.$('dialog').getBoundingClientRect();if(e.target===this.$('dialog')&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))this.$('dialog').close();});
  this.$('[data-action=retry]').addEventListener('click',()=>{this.map?.remove();this.map=null;this.$('.fallback').hidden=true;this.$('.loading').hidden=false;this.init(this.token);});
  this.$('.mobile-panel-toggle').addEventListener('click',()=>this.openPanel(!this.$('.sidebar').classList.contains('open')));
  this.$$('[data-layer]').forEach(input=>input.addEventListener('change',()=>this.updateLayers()));
  this.$('[data-action=mode]').addEventListener('click',()=>{
   if(!this.map)return;this.mode2D=!this.mode2D;this.$('[data-action=mode]').textContent=this.mode2D?'3D':'2D';this.$('[data-action=mode]').setAttribute('aria-pressed',String(this.mode2D));this.$('[data-action=mode]').setAttribute('aria-label',this.mode2D?'Вернуть объёмный вид':'Включить плоский вид');this.map.stop();this.map.easeTo({pitch:this.mode2D?0:61,duration:this.duration()});
  });
 }
 duration(){return matchMedia('(prefers-reduced-motion: reduce)').matches?0:1350;}
 openPanel(open){this.$('.sidebar').classList.toggle('open',open);this.$('.mobile-panel-toggle').setAttribute('aria-expanded',String(open));this.$('.panel-summary').textContent=open?'Закрыть ↓':'Открыть ↑';}
 async json(path){const r=await fetch(this.url(path),{signal:this.abort});if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return r.json();}
 async init(token){
  const attempt=this.initSerial=(this.initSerial||0)+1;
  this.failed=false;
  try{
   const embedded=this.querySelector('script[type="application/json"]');
   if(embedded){this.embedded=JSON.parse(embedded.textContent);this.data={manifest:this.embedded.manifest,...this.embedded.layers};}
   else {
    const names=['manifest','trails','lifts','stations','forest','roads','facilities','contours'];
    const values=await Promise.all(names.map(name=>this.json('live/'+name+(name==='manifest'?'.json':'.geojson'))));this.data=Object.fromEntries(names.map((name,i)=>[name,values[i]]));
   }
   if(this.token!==token||this.abort.aborted||attempt!==this.initSerial)return;
   this.$('.data-summary').textContent=`${this.data.manifest.named_trails.length} названных трасс OSM · ${this.data.lifts.features.length} подъёмника · сведения требуют сверки`;
   this.$('.source-counts').textContent=`Нанесено ${this.data.trails.features.length} объектов спусков, включая ${this.data.manifest.named_trails.length} названных линий; ${this.data.lifts.features.length} подъёмника. Независимо подтверждённых курортом трасс: 0.`;
   this.$('.lift-count').textContent='· '+this.data.lifts.features.length;this.renderList();
   const ml=await import('maplibre-gl');if(this.token!==token||this.abort.aborted||attempt!==this.initSerial)return;this.ml=ml;
   if(this.embedded?.worker){if(!offlineWorkerURL)offlineWorkerURL=URL.createObjectURL(new Blob([this.embedded.worker],{type:'text/javascript'}));ml.setWorkerUrl(offlineWorkerURL+(this.embedded.worker_format==='classic'?'#offline.cjs':''));}else ml.setWorkerUrl(workerURL);
   ml.setWorkerCount(2);
   let tileURL=this.url('live/dem/{z}/{x}/{y}.png').replaceAll('%7B','{').replaceAll('%7D','}');
   if(this.embedded){
    offlinePools.set(this.uid,this.embedded.tiles);
    if(!protocolRegistered){
     ml.addProtocol('mratkino',async(params,controller)=>{
      if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
      const u=new URL(params.url);const key=u.pathname.replace(/^\//,'');const content=offlinePools.get(u.hostname)?.[key];if(!content)throw Error('Отсутствует локальный тайл '+key);
      const binary=atob(content);const data=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);return {data:data.buffer};
     });protocolRegistered=true;
    }
    tileURL=`mratkino://${this.uid}/{z}/{x}/{y}.png`;
   }
   this.cameras={south:slopeCamera(this.data.trails.features,'south'),north:slopeCamera(this.data.trails.features,'north')};
   const camera=this.cameras.south;
   this.$('.map').replaceChildren();
   this.map=new ml.Map({container:this.$('.map'),style:createStyle(this.data,tileURL),center:SUMMIT,zoom:14,pitch:61,bearing:camera?.bearing||0,minZoom:12.8,maxZoom:16.5,maxPitch:72,maxBounds:[[58.405,53.975],[58.47,54.02]],cooperativeGestures:true,attributionControl:false,pixelRatio:Math.min(devicePixelRatio||1,1.5),canvasContextAttributes:{antialias:false},fadeDuration:150,locale:{'CooperativeGesturesHandler.WindowsHelpText':'Удерживайте Ctrl для масштабирования карты','CooperativeGesturesHandler.MacHelpText':'Удерживайте ⌘ для масштабирования карты','CooperativeGesturesHandler.MobileHelpText':'Используйте два пальца для управления картой'}});
   const map=this.map;this.setAttribute('data-map-state','loading');
   map.addControl(new ml.NavigationControl({visualizePitch:true}),'top-right');
   map.addControl(new ml.FullscreenControl({container:this.$('.map-wrap')}),'top-right');
   map.addControl(new ml.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-left');
   map.addControl(new ml.AttributionControl({compact:true}),'bottom-right');
   this.resizeObserver?.disconnect();this.resizeObserver=new ResizeObserver(()=>map.resize());this.resizeObserver.observe(this.$('.map-wrap'));
   this.readyTimer=setTimeout(()=>{if(this.getAttribute('data-map-state')!=='ready'||e.sourceId==='dem'||e.sourceId==='shade')this.fallback('Рельеф ещё загружается. Пока показан резервный вид; 3D-карта появится после загрузки.',false);},25000);
   map.on('load',()=>{
    if(this.map!==map)return;
    this.addMarkers();this.updateLayers();this.chooseView(this.view,false);this.finishLoading();
   });
   map.on('idle',()=>{if(map.isSourceLoaded('dem'))this.finishLoading();});
   map.on('error',e=>{
    if(this.map!==map)return;
    const message=e.error?.message||'Ошибка карты';
    if(/Abort|abort/i.test(message))return;
    if(this.getAttribute('data-map-state')!=='ready'||e.sourceId==='dem'||e.sourceId==='shade')this.fallback('3D-карта недоступна: '+message);
    else {this.$('.error-note').hidden=false;this.$('.error-note').textContent='Часть данных не загрузилась. '+message;}
   });
   map.on('webglcontextlost',()=>this.fallback('Браузер потерял WebGL-контекст. Показан резервный вид; можно повторить загрузку.'));
   // Stop a camera animation as soon as the user starts an actual gesture.
   map.on('mousedown',e=>{if(e.originalEvent?.isTrusted)map.stop();});
   map.on('touchstart',e=>{if(e.originalEvent?.isTrusted)map.stop();});
   map.on('wheel',e=>{if(e.originalEvent?.isTrusted)map.stop();});
   map.on('movestart',e=>{if(e.originalEvent)this.hideHint();});
   map.on('rotateend',()=>{this.setAttribute('data-bearing',map.getBearing().toFixed(2));});
   map.on('moveend',()=>this.reflectCamera());
   for(const layer of ['trail-line','trail-area','trail-area-edge']){
    map.on('click',layer,e=>{const f=this.findTrail(e.features?.[0]?.properties?.id);if(f)this.selectTrail(f,false);});
    map.on('mouseenter',layer,e=>{map.getCanvas().style.cursor='pointer';this.highlight(e.features?.[0]?.properties?.id);});
    map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';this.highlight();});
   }
  }catch(e){if(e.name!=='AbortError'&&this.token===token&&attempt===this.initSerial)this.fallback('Не удалось открыть 3D-карту: '+e.message);}
 }
 finishLoading(){
  if(this.failed||!this.map||!this.map.isStyleLoaded()||!this.map.isSourceLoaded('dem'))return;
  clearTimeout(this.readyTimer);this.$('.loading').hidden=true;this.$('.fallback').hidden=true;this.setAttribute('data-map-state','ready');this.reflectCamera();
  if(!this.hintTimer)this.hintTimer=setTimeout(()=>this.hideHint(),14000);
 }
 reflectCamera(){if(!this.map)return;this.setAttribute('data-bearing',this.map.getBearing().toFixed(2));this.setAttribute('data-pitch',this.map.getPitch().toFixed(2));this.setAttribute('data-zoom',this.map.getZoom().toFixed(2));}
 hideHint(){this.$('.hint').hidden=true;}
 fallback(message,fatal=true){
  this.failed=fatal;clearTimeout(this.readyTimer);this.setAttribute('data-map-state','fallback');this.$('.loading').hidden=true;const panel=this.$('.fallback');panel.hidden=false;panel.querySelector('p').textContent=message;
  const img=panel.querySelector('img');img.onerror=()=>{img.hidden=true;};img.src=this.embedded?.fallback||this.url('live/fallback.webp');
 }
 findTrail(id){return this.data?.trails.features.find(f=>f.properties.id===id);}
 renderList(){
  const view=this.view==='overview'?'south':this.view;const names=EXPECTED[view];const list=this.$('.trail-list');list.replaceChildren();
  this.$('.trail-count').textContent=String(names.length).padStart(2,'0');this.$('.panel-sub').textContent=(view==='south'?'Южный':'Северный')+' склон · данные OSM, не сверено';
  for(const name of names){
   const f=this.data?.trails.features.find(f=>f.properties.name===name&&f.geometry.type==='LineString');const b=document.createElement('button');b.type='button';b.className='trail-row'+(f?'':' missing');b.dataset.name=name;b.dataset.id=f?.properties.id||name;b.setAttribute('aria-pressed',String(this.selected===(f?.properties.id||name)));
   const dot=document.createElement('span');dot.className='trail-marker'+(f?'':' missing');dot.textContent=f?'↘':'—';
   const title=document.createElement('strong');title.textContent=name;const state=document.createElement('span');state.className='trail-state';state.textContent=!f?'Нет геометрии':f.properties.warnings.length?'Конфликт тегов':'OSM · не сверено';if(f?.properties.warnings.length)state.classList.add('trail-status-warning');b.append(dot,title,state);
   b.addEventListener('click',()=>f?this.selectTrail(f,false):this.missingCard(name));b.addEventListener('mouseenter',()=>f&&this.highlight(f.properties.id));b.addEventListener('mouseleave',()=>this.highlight());list.append(b);
  }
 }
 missingCard(name){this.selected=name;this.renderList();const card=this.$('.card');card.replaceChildren();this.cardTitle(card,'ГЕОМЕТРИЯ НЕ ПОЛУЧЕНА','Трасса '+name);this.text(card,'Название есть в задании, но соответствующая линия в открытой выгрузке не найдена. Длина, перепад и сложность требуют уточнения.');this.highlight();this.openPanel(true);}
 cardTitle(card,label,title){const tiny=document.createElement('span');tiny.className='tiny';tiny.textContent=label;const h=document.createElement('h3');h.textContent=title;card.append(tiny,h);}
 text(parent,value,className=''){const p=document.createElement('p');p.textContent=value;p.className=className;parent.append(p);return p;}
 selectTrail(f,fly=false){
  this.selected=f.properties.id;this.view=f.properties.slope;this.updateViewButtons();this.renderList();this.openPanel(true);
  const card=this.$('.card');card.replaceChildren();const p=f.properties;this.cardTitle(card,'OSM · НЕ СВЕРЕНО КУРОРТОМ',p.name);
  const dl=document.createElement('dl');const values=[['Склон',p.slope==='north'?'Северный':'Южный'],['Длина','Требует уточнения'],['Перепад','Требует уточнения'],['Сложность','Требует уточнения']];
  for(const [key,value] of values){const dt=document.createElement('dt');dt.textContent=key;const dd=document.createElement('dd');dd.textContent=value;dl.append(dt,dd);}card.append(dl);
  if(p.mapped_length_m)this.text(card,`По линии OSM ≈ ${p.mapped_length_m.toLocaleString('ru-RU')} м. Это вычисление по геометрии, не паспортная длина.`);
  for(const warning of p.warnings||[])this.text(card,warning+'. Требуется сверка.','warning');
  const link=document.createElement('a');link.href='https://www.openstreetmap.org/'+p.id;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Исходный объект OSM ↗';card.append(link);
  const button=document.createElement('button');button.type='button';button.className='show-trail';button.textContent='Показать трассу';button.addEventListener('click',()=>this.flyToFeatures([f],this.cameras[p.slope]?.bearing||0));card.append(button);
  this.highlight();if(fly)this.flyToFeatures([f],this.cameras[p.slope]?.bearing||0);
 }
 highlight(hovered){
  if(!this.map?.getLayer('trail-line'))return;const id=hovered||(this.findTrail(this.selected)?this.selected:null);
  const match=['==',['get','id'],id||''];
  for(const layer of ['trail-line','trail-casing','trail-area-edge'])this.map.setPaintProperty(layer,'line-opacity',id?['case',match,1,0.28]:layer==='trail-area-edge'?0.45:0.95);
  this.map.setPaintProperty('trail-line','line-width',id?['case',match,5.5,2.5]:3);
  this.map.setPaintProperty('trail-area','fill-opacity',id?['case',match,0.94,0.5]:0.88);
  this.markers.forEach(({element,id:fid})=>element.setAttribute('aria-pressed',String(fid===id)));
 }
 updateLayers(){
  if(!this.map?.getLayer('snow'))return;
  const groups={lifts:['lift-line','lift-casing','lift-stations'],contours:['contours'],facilities:['facility-buildings','facility-points'],forest:['forest']};
  for(const [name,layers] of Object.entries(groups)){const input=this.$(`[data-layer=${name}]`);for(const layer of layers)this.map.setLayoutProperty(layer,'visibility',input.checked?'visible':'none');}
 }
 updateViewButtons(){this.$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===this.view)));this.$('.view-label').textContent=this.view==='overview'?'ОБЩИЙ ВИД':this.view==='north'?'СЕВЕРНЫЙ СКЛОН':'ЮЖНЫЙ СКЛОН';}
 chooseView(view,animate=true){
  this.view=view;this.selected=null;this.updateViewButtons();this.renderList();this.highlight();
  if(!this.map?.getLayer('snow'))return;
  const preset=view==='overview'?{bounds:boundsFor(this.data.trails.features),bearing:this.cameras.south?.bearing||0,pitch:57}:this.cameras[view];
  if(preset)this.flyToBounds(preset.bounds,preset.bearing,preset.pitch,animate);
 }
 flyToFeatures(features,bearing){const bounds=boundsFor(features);if(bounds)this.flyToBounds(bounds,bearing,62,true);}
 flyToBounds(bounds,bearing,pitch,animate){
  const map=this.map;if(!map||!bounds)return;
  const camera=map.cameraForBounds(bounds,{bearing,padding:matchMedia('(max-width:760px)').matches?55:75,maxZoom:15.5});if(!camera)return;
  map.stop();map.easeTo({...camera,pitch:this.mode2D?0:pitch,bearing,duration:animate?this.duration():0,essential:false});
 }
 addMarkers(){
  this.markers.forEach(({marker})=>marker.remove());this.markers=[];
  for(const f of this.data.trails.features){
   if(!/^[ЮС][1-5]$/.test(f.properties.name)||f.geometry.type!=='LineString')continue;
   const element=document.createElement('button');element.type='button';element.className='route-label';element.textContent=f.properties.name+(f.properties.warnings.length?' !':'');element.setAttribute('aria-label','Трасса '+f.properties.name+', данные OSM, требуют сверки');element.setAttribute('aria-pressed','false');element.addEventListener('click',e=>{e.stopPropagation();this.selectTrail(f);});
   const points=coordinates(f.geometry);const marker=new this.ml.Marker({element,anchor:'center',occludedOpacity:0.25}).setLngLat(points[Math.floor(points.length/2)]).addTo(this.map);this.markers.push({marker,element,id:f.properties.id});
  }
  const element=document.createElement('span');element.className='summit-label';element.textContent='▲ Мраткино · OSM 795,1 м';const marker=new this.ml.Marker({element,anchor:'bottom',offset:[0,-8]}).setLngLat(SUMMIT).addTo(this.map);this.markers.push({marker,element,id:'summit'});
 }
}
if(!customElements.get('mratkino-map'))customElements.define('mratkino-map',MratkinoMap);
