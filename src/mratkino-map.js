import workerURL from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import mapCSS from 'maplibre-gl/dist/maplibre-gl.css?inline';
import componentCSS from './component.css?inline';
import explorerCSS from './explorer.css?inline';
import { SUMMIT, EXPECTED, boundsFor, coordinates, slopeCamera, createStyle, EMPTY } from './map-data.js';

import {RegionController} from './region/controller.js';
import {createRegionalStyle} from './region/style.js';
import {classification,pisteId} from './region/piste-catalog.js';

const offlinePools=new Map();let sequence=0,protocolRegistered=false,offlineWorkerURL=null;
const template=`
<div class="shell">
 <header class="head"><div><p class="eyebrow">БЕЛОРЕЦК · ЮЖНЫЙ УРАЛ</p><div class="title-line"><h1>Мраткино</h1><p>Гора. Трассы. Ваш следующий спуск.</p></div></div><span class="brand"><span>visit</span>beloretsk</span></header>
 <div class="toolbar"><div class="views" role="group" aria-label="Положение камеры"><button type="button" data-view="south" aria-pressed="true">Южный склон</button><button type="button" data-view="north" aria-pressed="false">Северный склон</button><button type="button" data-view="overview" aria-pressed="false">Общий вид</button></div><div class="toolbar-right"><span class="verified-label">ЗИМНЯЯ КАРТА · 3D</span><button type="button" class="data-button" data-action="sources">ⓘ О данных</button></div></div>
 <div class="workspace"><div class="map-wrap"><div class="map" aria-label="Вращающаяся трёхмерная карта Мраткино"></div><div class="map-label"><span>МРАТКИНО / <b class="view-label">ЮЖНЫЙ СКЛОН</b></span><small>Зимнее оформление · не текущие условия</small></div><button class="mode-button" type="button" data-action="mode" aria-pressed="false" aria-label="Включить плоский вид">2D</button><div class="life-tools"><button type="button" data-action="life" aria-pressed="false" disabled>✦ Оживить карту</button><button type="button" data-action="life-pause" aria-pressed="false" hidden>Пауза</button></div><p class="life-note" hidden>Иллюстрация · не работа в реальном времени<br>Приблизьте карту, чтобы рассмотреть детали</p><div class="hint">Вращайте и приближайте карту<br>Правая кнопка мыши · на телефоне — два пальца</div><div class="error-note" role="status" hidden></div><div class="loading" role="status"><span class="spinner" aria-hidden="true"></span><p>Готовим настоящий рельеф Мраткино…</p></div><div class="fallback" hidden><img alt="Резервный статичный ракурс реального рельефа Мраткино"/><p></p><button type="button" data-action="retry">Повторить загрузку 3D-карты</button></div></div>
 <aside class="sidebar"><button type="button" class="mobile-panel-toggle" aria-expanded="false"><span>Трассы, подъёмники и слои</span><span class="panel-summary">Открыть ↑</span></button><div class="panel-body"><div class="panel-head"><h2>Трассы</h2><span class="trail-count">05</span></div><p class="panel-sub">Южный склон · геометрия OpenStreetMap</p><div class="trail-list"></div><section class="card" aria-live="polite"><span class="tiny">ИССЛЕДУЙТЕ МРАТКИНО</span><h3>Выберите трассу</h3><p>Нажмите на линию, подпись или название в списке.</p></section><div class="lift-list" aria-label="Подъёмники"></div><div class="layers"><h3>На карте</h3><label><span><i class="layer-symbol lift-symbol"></i>Подъёмники <small class="lift-count"></small></span><input type="checkbox" role="switch" data-layer="lifts" checked/></label><label><span><i class="layer-symbol contour-symbol"></i>Горизонтали · 25 м</span><input type="checkbox" role="switch" data-layer="contours"/></label><label><span><i class="layer-symbol facility-symbol"></i>Инфраструктура</span><input type="checkbox" role="switch" data-layer="facilities" checked/></label><label><span><i class="layer-symbol forest-symbol"></i>Лес по OSM</span><input type="checkbox" role="switch" data-layer="forest" checked/></label><p class="legend"><i></i> Цвет выделения не означает сложность.<br>Фиолетовый пунктир — подъёмники.</p></div></div></aside></div>
 <footer class="foot"><span><i class="dot"></i><span class="data-summary">Загружаем геоданные…</span></span><button type="button" data-action="sources">Источники и точность ↗</button></footer>
</div>
<dialog class="dialog"><header><p class="eyebrow">ГЕОГРАФИЯ И ПРОИСХОЖДЕНИЕ</p><button type="button" data-action="close-dialog" aria-label="Закрыть">×</button></header><h2>Реальная гора.<br>Проверяемые источники.</h2><p>Общая карта использует рельеф Mapterhorn; исходная автономная сцена — Copernicus DEM GLO-30, около 30 м, высоты EGM2008. Преувеличение равно 1. Тени и зимние цвета — оформление, а не сведения о текущем снежном покрове.</p><h3>Трассы и подъёмники</h3><p class="source-counts"></p><p>Линии, полигоны спусков, лес, дороги и объекты взяты из OpenStreetMap. Это данные сообщества, а не подтверждение курортом. Работа подъёмников и открытие трасс в реальном времени не отображаются.</p><ul><li>Ю5 исключена: по уточнению владельца такой трассы нет.</li><li>У объекта «Ю3» противоречие: ref=Ю2. Он отмечен для сверки.</li><li>Длина по линии OSM — вычисление по геометрии, а не паспортная длина трассы. Сложность и перепад требуют уточнения.</li></ul><h3>О модели и управлении</h3><p>Общий рельеф загружается тайлами Mapterhorn (Terrarium, максимальный исходный уровень 12); преувеличение 1. Локальные Copernicus PNG-тайлы сохранены для автономной версии. Региональные леса, реки и улицы — OpenFreeMap / OpenMapTiles / OSM. Городские подписи, POI и 3D-здания отключены. Камеры склонов рассчитаны по линиям трасс и направлению от их нижних концов к вершине OSM. Исходные линии и маски леса сохранены. Режим «Оживить карту» добавляет условные высокие сосны внутри лесных участков и движущиеся модели по линиям подъёмников и лыжников со сноубордистами по существующим именованным трассам, кроме закрытой С1; размеры, расположение отдельных деревьев, деревья высотой 20–30 м, пассажиры и движение иллюстративные, не результаты съёмки или мониторинга. С1 не работает и зарастает молодыми елями — по сведениям владельца; точная граница зарастания не обследована. В иллюстрации открытые кресла трёхместные по описанию владельца; OSM указывает четыре места, требуется сверка.</p><p>Мышь: перетаскивание — перемещение; правая кнопка или Ctrl + перетаскивание — поворот и наклон; колесо — масштаб без Ctrl. На телефоне — два пальца; одним пальцем можно прокручивать страницу. На клавиатуре: +/−, стрелки; Shift + стрелки — наклон и поворот. В полноэкранном режиме кооперативное управление временно отключается движком.</p><h3>Локации и маршруты</h3><p>Подписи вершин сопоставлены с OSM по названиям и положению; ориентиры хребтов и непроверенные точки отмечены в карточках. Для Ямантау и Малого Ямантау действуют ограничения заповедника. Встроенных проверенных туристических треков пока нет. Тропы OSM не подтверждают возможность прохода. Можно локально открыть собственный GPX или GeoJSON; файл не отправляется на сервер. Линия фрирайда OSM way/933862767 справа от Ю4 скрыта по уточнению владельца; исходный GeoJSON сохранён.</p><h3>Атрибуция</h3><p><a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">Mapterhorn · источники рельефа</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · OpenMapTiles</p><p>© OpenStreetMap contributors, ODbL 1.0.<br>Copernicus DEM: © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.<br>MapLibre GL JS — BSD-3-Clause.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Условия OpenStreetMap ↗</a></dialog>`;

class MratkinoMap extends HTMLElement {
 connectedCallback(){
  if(this.started)return;this.started=true;this.token=(this.token||0)+1;this.uid=String(++sequence);this.view='south';this.selected=null;this.mode2D=false;this.markers=[];this.lifeScene=null;this.lifeLoading=false;this.resortLoaded=false;this.resortActive=false;this.setAttribute('data-map-state','loading');
  this.controller=new AbortController();this.abort=this.controller.signal;
  const shadow=this.shadowRoot||this.attachShadow({mode:'open'});shadow.innerHTML=`<style>${mapCSS}\n${componentCSS}\n${explorerCSS}</style>${template}`;
  this.$=selector=>shadow.querySelector(selector);this.$$=selector=>[...shadow.querySelectorAll(selector)];
  const pageBase=/^(https?:|file:)/.test(document.baseURI)?document.baseURI:'https://mratkino.invalid/';
  this.assetBase=new URL(this.getAttribute('asset-base')||'./',pageBase);
  this.region=new RegionController(this);if(!this.querySelector('script[type="application/json"]'))this.region.setup();else this.region=null;
  this.bindUI();this.renderList();
  this.observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){this.observer.disconnect();this.init(this.token);}}, {rootMargin:'250px'});this.observer.observe(this);
 }
 disconnectedCallback(){this.started=false;this.token++;this.controller?.abort();this.observer?.disconnect();this.resizeObserver?.disconnect();clearTimeout(this.readyTimer);clearTimeout(this.hintTimer);this.region?.dispose();this.disposeLife();this.map?.remove();this.map=null;this.lifeScene=null;offlinePools.delete(this.uid);}
 url(path){return new URL(path,this.assetBase).href;}
 bindUI(){
  this.$$('[data-view]').forEach(b=>b.addEventListener('click',()=>this.chooseView(b.dataset.view)));
  this.$$('[data-action=sources]').forEach(b=>b.addEventListener('click',()=>this.$('dialog').showModal()));
  this.$('[data-action=close-dialog]').addEventListener('click',()=>this.$('dialog').close());
  this.$('dialog').addEventListener('click',e=>{const r=this.$('dialog').getBoundingClientRect();if(e.target===this.$('dialog')&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))this.$('dialog').close();});
  this.$('[data-action=retry]').addEventListener('click',()=>{this.region?.resetMap();this.disposeLife();this.map?.remove();this.map=null;this.lifeScene=null;this.lifeLoading=false;this.reflectLife();this.$('.fallback').hidden=true;this.$('.loading').hidden=false;this.init(this.token);});
  this.$('.mobile-panel-toggle').addEventListener('click',()=>this.openPanel(!this.$('.sidebar').classList.contains('open')));
  this.$('[data-action=life]').addEventListener('click',()=>this.region?this.region.toggleEffects():this.toggleLife());
  this.$('[data-action=life-pause]').addEventListener('click',()=>{const scene=this.region?.ski.active?this.region.ski.scene:this.lifeScene;scene?.setPaused(!scene.paused);this.reflectLife();});
  this.$$('[data-layer]').forEach(input=>input.addEventListener('change',()=>this.updateLayers()));
  this.$('[data-action=mode]').addEventListener('click',()=>{
   if(!this.map)return;this.mode2D=!this.mode2D;this.$('[data-action=mode]').textContent=this.mode2D?'3D':'2D';this.$('[data-action=mode]').setAttribute('aria-pressed',String(this.mode2D));this.$('[data-action=mode]').setAttribute('aria-label',this.mode2D?'Вернуть объёмный вид':'Включить плоский вид');this.map.stop();this.map.easeTo({pitch:this.mode2D?0:61,duration:this.duration()});
  });
 }
 duration(){return matchMedia('(prefers-reduced-motion: reduce)').matches?0:1350;}
 openPanel(open){if(this.region){this.region.showCard(open);return;}this.$('.sidebar').classList.toggle('open',open);this.$('.mobile-panel-toggle').setAttribute('aria-expanded',String(open));this.$('.panel-summary').textContent=open?'Закрыть ↓':'Открыть ↑';}
 async json(path){const r=await fetch(this.url(path),{signal:this.abort});if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return r.json();}
 async init(token){
  const attempt=this.initSerial=(this.initSerial||0)+1;
  this.failed=false;
  try{
   const embedded=this.querySelector('script[type="application/json"]');
   if(embedded){this.embedded=JSON.parse(embedded.textContent);this.data={manifest:this.embedded.manifest,...this.embedded.layers};}
   else {
    this.resortLoaded=false;this.region.resortPromise=null;
    this.data={manifest:await this.json('live/manifest.json'),...Object.fromEntries(['trails','lifts','stations','forest','roads','facilities','contours'].map(n=>[n,EMPTY]))};
    if(this.region.id==='mratkino')try{await this.region.ensureResort();}catch(error){this.region.retryAfter.set('mratkino',Date.now()+30000);this.region.dataError(error);}
   }
   if(this.token!==token||this.abort.aborted||attempt!==this.initSerial)return;
   this.$('.data-summary').textContent=`${this.data.manifest.named_trails.length} названных трасс OSM · ${this.data.lifts.features.length} подъёмника · сведения требуют сверки`;
   this.$('.source-counts').textContent=`Нанесено ${this.data.trails.features.length} объектов спусков, включая ${this.data.manifest.named_trails.length} названных линий; ${this.data.lifts.features.length} подъёмника. Независимо подтверждённых курортом трасс: 0.`;
   this.$('.source-counts').textContent=this.resortLoaded?`В исходнике ${this.data.trails.features.length} объектов спусков; отображаются 7 именованных линий и 4 подъёмника. Геометрия OSM требует сверки с курортом.`:'Подробные данные Мраткино загружаются при приближении к комплексу.';
  this.$('.lift-count').textContent='· '+this.data.lifts.features.length;this.renderList();this.renderLifts();
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
   if(this.embedded)this.resortLoaded=true;
   this.applyResortData();
   const camera=this.cameras.south;
   this.$('.map').replaceChildren();
   this.map=new ml.Map({container:this.$('.map'),style:this.region?createRegionalStyle(this.data,this.resortLoaded?this.url('live/forest-winter.png'):null):createStyle(this.data,tileURL,this.embedded?.forest||this.url('live/forest-winter.png')),center:this.region?.preset().center||SUMMIT,zoom:this.region?.preset().zoom||14,pitch:this.region?.preset().pitch??61,bearing:this.region?.id==='mratkino'?(camera?.bearing||0):(this.region?.preset().bearing??camera?.bearing??0),minZoom:this.region?5:12.8,maxZoom:20.2,maxPitch:72,...(this.region?{}:{maxBounds:[[58.405,53.975],[58.47,54.02]]}),cooperativeGestures:matchMedia('(pointer: coarse)').matches,attributionControl:false,pixelRatio:Math.min(devicePixelRatio||1,1.5),canvasContextAttributes:{antialias:false},fadeDuration:150,locale:{'CooperativeGesturesHandler.WindowsHelpText':'Удерживайте Ctrl для масштабирования карты','CooperativeGesturesHandler.MacHelpText':'Удерживайте ⌘ для масштабирования карты','CooperativeGesturesHandler.MobileHelpText':'Используйте два пальца для управления картой'}});
   const map=this.map;this.setAttribute('data-map-state','loading');
   map.addControl(new ml.NavigationControl({visualizePitch:true}),this.region?'top-left':'top-right');
   map.addControl(new ml.FullscreenControl({container:this.$('.map-wrap')}),'top-right');
   map.addControl(new ml.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-left');
   map.addControl(new ml.AttributionControl({compact:true}),'bottom-right');
   this.resizeObserver?.disconnect();this.resizeObserver=new ResizeObserver(()=>map.resize());this.resizeObserver.observe(this.$('.map-wrap'));
   this.readyTimer=setTimeout(()=>{if(this.getAttribute('data-map-state')!=='ready')this.fallback('Рельеф ещё загружается. Пока показан резервный вид; 3D-карта появится после загрузки.',false);},25000);
   map.on(this.region?'style.load':'load',()=>{
    if(this.map!==map)return;
    this.addMarkers();this.updateLayers();if(this.region){this.region.addLabels();this.region.bootstrap().catch(error=>this.region.dataError(error));this.region.sync();}else this.chooseView(this.view,false);this.finishLoading();
   });
   map.on('idle',()=>this.finishLoading());
   map.on('sourcedata',e=>{if(e.sourceId==='dem')this.finishLoading();});
   map.on('error',e=>{
    if(this.map!==map)return;
    const message=e.error?.message||'Ошибка карты';
    if(/Abort|abort/i.test(message))return;
    if(e.sourceId==='dem'||e.sourceId==='shade')this.fallback('3D-карта недоступна: '+message);
    else if(this.region)this.region.dataError(e.error);else {this.$('.error-note').hidden=false;this.$('.error-note').textContent='Часть данных не загрузилась. '+message;}
   });
   map.on('webglcontextlost',()=>this.fallback('Браузер потерял WebGL-контекст. Показан резервный вид; можно повторить загрузку.'));
   // Stop a camera animation as soon as the user starts an actual gesture.
   map.on('mousedown',e=>{if(e.originalEvent?.isTrusted)map.stop();});
   map.on('touchstart',e=>{if(e.originalEvent?.isTrusted)map.stop();});
   map.on('wheel',e=>{if(e.originalEvent?.isTrusted)map.stop();});
   map.on('movestart',e=>{if(e.originalEvent)this.hideHint();});
   map.on('rotateend',()=>{this.setAttribute('data-bearing',map.getBearing().toFixed(2));});
   map.on('moveend',()=>{this.reflectCamera();this.region?.sync();});
   map.on('render',()=>{if(this.getAttribute('data-map-state')!=='ready')this.finishLoading();this.layoutLabels();this.region?.layoutLabels();});
   map.on('click','lift-line',e=>{const f=this.data.lifts.features.find(f=>f.properties.id===e.features?.[0]?.properties?.id);if(f)this.selectLift(f);});
   for(const layer of ['trail-line','trail-area','trail-area-edge']){
    map.on('click',layer,e=>{const f=this.findTrail(e.features?.[0]?.properties?.id);if(f)this.selectTrail(f,false);});
    map.on('mouseenter',layer,e=>{map.getCanvas().style.cursor='pointer';this.highlight(e.features?.[0]?.properties?.id);});
    map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';this.highlight();});
   }
  }catch(e){if(e.name!=='AbortError'&&this.token===token&&attempt===this.initSerial)this.fallback('Не удалось открыть 3D-карту: '+e.message);}
 }
 applyResortData(){
  this.cameras={south:slopeCamera(this.data.trails.features,'south'),north:slopeCamera(this.data.trails.features,'north')};
  this.$('.source-counts').textContent=this.resortLoaded?`В исходнике ${this.data.trails.features.length} объектов спусков; отображаются 7 именованных линий и 4 подъёмника. Геометрия OSM требует сверки с курортом.`:'Подробные данные Мраткино загружаются при приближении к комплексу.';
  this.$('.lift-count').textContent='· '+this.data.lifts.features.length;this.renderList();this.renderLifts();
 }
 finishLoading(){
  if(this.failed||!this.map||!this.map.getLayer('snow')||!Number.isFinite(this.map.queryTerrainElevation(this.map.getCenter())))return;
  const first=this.getAttribute('data-map-state')!=='ready';clearTimeout(this.readyTimer);this.$('.loading').hidden=true;this.$('.fallback').hidden=true;this.setAttribute('data-map-state','ready');this.reflectLife();this.reflectCamera();this.region?.bridge.tryReady();if(first)this.region?.syncScene();
  if(!this.hintTimer)this.hintTimer=setTimeout(()=>this.hideHint(),14000);
 }
 reflectCamera(){if(!this.map)return;this.setAttribute('data-bearing',this.map.getBearing().toFixed(2));this.setAttribute('data-pitch',this.map.getPitch().toFixed(2));this.setAttribute('data-zoom',this.map.getZoom().toFixed(2));}
 hideHint(){this.$('.hint').hidden=true;}
 fallback(message,fatal=true){
  this.region?.bridge.reset();this.region?.bridge.event('error',{code:'WEBGL_UNAVAILABLE',message:'3D-карта недоступна. Повторите загрузку или откройте обычную карту.',recoverable:true});this.region?.disposeScenes();
  this.failed=fatal;clearTimeout(this.readyTimer);this.setAttribute('data-map-state','fallback');this.$('.loading').hidden=true;const panel=this.$('.fallback');panel.hidden=false;panel.querySelector('p').textContent=message;
  const img=panel.querySelector('img');img.onerror=()=>{img.hidden=true;};img.hidden=!!this.region&&this.region.id!=='mratkino';if(!img.hidden)img.src=this.embedded?.fallback||this.url('live/fallback.webp');
 }
 findTrail(id){return this.data?.trails.features.find(f=>f.properties.id===id);}
 renderList(){
  const view=this.view==='overview'?'south':this.view;const names=this.region||this.view==='overview'?[...EXPECTED.south,...EXPECTED.north]:EXPECTED[view];const list=this.$('.trail-list');list.replaceChildren();
  this.$('.trail-count').textContent=String(names.length).padStart(2,'0');this.$('.panel-sub').textContent=(this.view==='overview'?'Все склоны':view==='south'?'Южный склон':'Северный склон')+' · сведения требуют сверки';
  for(const name of names){
   const f=this.data?.trails.features.find(f=>f.properties.name===name&&f.geometry.type==='LineString');const b=document.createElement('button');b.type='button';b.className='trail-row'+(f?'':' missing');b.dataset.name=name;b.dataset.id=f?.properties.id||name;b.setAttribute('aria-pressed',String(this.selected===(f?.properties.id||name)));
   const dot=document.createElement('span');dot.className='trail-marker'+(f?'':' missing');dot.textContent=f?'•':'—';
   const title=document.createElement('strong');title.textContent=name;const state=document.createElement('span');state.className='trail-state';state.textContent=!f?'Нет данных':classification('mratkino',f.properties).label;dot.style.color=f?classification('mratkino',f.properties).color:'';if(name==='С1')b.classList.add('closed-trail');b.append(dot,title,state);
   b.addEventListener('click',()=>f?this.selectTrail(f,false):this.missingCard(name));b.addEventListener('mouseenter',()=>f&&this.highlight(f.properties.id));b.addEventListener('mouseleave',()=>this.highlight());list.append(b);
  }
 }
 missingCard(name){this.selected=name;this.renderList();const card=this.$('.card');card.replaceChildren();this.cardTitle(card,'ГЕОМЕТРИЯ НЕ ПОЛУЧЕНА','Трасса '+name);this.text(card,'Название есть в задании, но соответствующая линия в открытой выгрузке не найдена. Длина, перепад и сложность требуют уточнения.');this.highlight();this.openPanel(true);}
 cardTitle(card,label,title){const tiny=document.createElement('span');tiny.className='tiny';tiny.textContent=label;const h=document.createElement('h3');h.textContent=title;card.append(tiny,h);}
 text(parent,value,className=''){const p=document.createElement('p');p.textContent=value;p.className=className;parent.append(p);return p;}
 selectTrail(f,fly=false,meta={}){
  this.selected=f.properties.id;this.view=f.properties.slope;this.updateViewButtons();this.renderList();
  const card=this.$('.card');card.replaceChildren();const p=f.properties,c=classification('mratkino',p);this.cardTitle(card,'Трасса',p.name);this.text(card,c.label,'difficulty-value');
  if(!c.verified)this.text(card,'Категория по OSM; подтверждение курортом не получено.');
  if(p.name==='Ю3')this.text(card,'Номер требует сверки: в источнике также указан Ю2.');
  if(p.name==='С1')this.text(card,'По прежним сведениям владельца склон не использовался. Текущее состояние не подтверждено.','owner-note');
  const button=document.createElement('button');button.type='button';button.className='show-trail';button.textContent='Показать трассу';button.addEventListener('click',()=>this.flyToFeatures(this.data.trails.features.filter(x=>x.properties.name===p.name),this.cameras[p.slope]?.bearing||0));card.append(button);
  this.highlight();if(this.region)this.region.selectFeature('mratkino',pisteId('mratkino',p),meta);else this.openPanel(true);if(fly)this.flyToFeatures([f],this.cameras[p.slope]?.bearing||0);
 }
 highlight(hovered){
  if(!this.map?.getLayer('trail-line'))return;const id=hovered||(this.findTrail(this.selected)?this.selected:null),name=this.findTrail(id)?.properties.name;
  const match=['==',['get','name'],name||''];
  for(const layer of ['trail-line','trail-casing','trail-area-edge'])this.map.setPaintProperty(layer,'line-opacity',layer==='trail-area-edge'?0:.95);
  this.map.setPaintProperty('trail-line','line-width',['interpolate',['linear'],['zoom'],11,['case',match,4.5,2.4],17,['case',match,7,4.5]]);this.map.setPaintProperty('trail-casing','line-width',['interpolate',['linear'],['zoom'],11,['case',match,7.5,5.4],17,['case',match,10,7.5]]);
  this.map.setPaintProperty('trail-area','fill-opacity',id?['case',match,.20,.08]:.12);this.markers.forEach(({element,id:fid})=>element.setAttribute('aria-pressed',String(fid===id)));
 }
 disposeLife(){
  const scene=this.lifeScene;if(!scene)return;
  if(this.map?.getLayer(scene.id))this.map.removeLayer(scene.id);
  if(!scene.disposed)scene.onRemove();
  this.lifeScene=null;
 }
 async forestBuffer(){
  if(this.embedded?.forest_instances){const bytes=Uint8Array.from(atob(this.embedded.forest_instances),c=>c.charCodeAt(0));return bytes.buffer;}
  const response=await fetch(this.url('live/forest-instances.bin'),{signal:this.abort});if(!response.ok)throw Error('Forest instances HTTP '+response.status);return response.arrayBuffer();
 }
 async toggleLife(force,internal=false){
  if(this.region&&!internal)return this.region.toggleEffects();
  if(!this.map||this.getAttribute('data-map-state')!=='ready'||this.lifeLoading||(this.region&&!this.resortActive))return;
  if(this.lifeScene){this.lifeScene.setEnabled(force===true||!this.lifeScene.enabled);this.reflectLife();return;}
  const map=this.map,token=this.token;let pendingScene;this.lifeLoading=true;this.$('[data-action=life]').disabled=true;this.$('[data-action=life]').textContent='Готовим 3D-сцену…';
  try{
   const [{ResortScene},{decodeForestInstances},forestBuffer]=await Promise.all([import('./resort-scene.js'),import('./resort-scene-data.js'),this.forestBuffer()]);
   if(this.map!==map||this.token!==token||(this.region&&(!this.resortActive||!this.region.effectsAllowed||this.region.context!=='mratkino')))return;
   const scene=pendingScene=new ResortScene(map,this.ml,this.data,{mobile:matchMedia('(max-width:760px)').matches,forestInstances:decodeForestInstances(forestBuffer),onStats:stats=>{if(this.map!==map)return;this.setAttribute('data-scene-trees',String(stats.trees));this.setAttribute('data-scene-saplings',String(stats.saplings));this.reflectLife();}});
   this.lifeScene=scene;map.addLayer(scene);this.updateLayers();this.hideHint();
  }catch(error){if(this.map===map){if(map.getLayer('resort-life'))map.removeLayer('resort-life');if(pendingScene&&!pendingScene.disposed)pendingScene.onRemove();this.lifeScene=null;this.$('.error-note').hidden=false;this.$('.error-note').textContent='Объёмная сцена не загрузилась. Карта доступна. '+error.message;}}
  finally{if(this.map===map&&this.token===token){this.lifeLoading=false;this.reflectLife();}}
 }
 reflectLife(){
  if(this.region){this.region.reflectLife();return;}
  if(this.region?.ski.active){this.region.ski.reflectLife();return;}
  if(this.region?.hiking.active&&!this.resortActive){this.region.hiking.reflectLife();return;}
  const enabled=!!this.lifeScene?.enabled,paused=!!this.lifeScene?.paused;
  this.$('[data-action=life]').disabled=this.lifeLoading||this.getAttribute('data-map-state')!=='ready'||!!this.region&&!this.resortActive;
  this.$('[data-action=life]').textContent=enabled?'✦ Живая сцена':'✦ Оживить карту';this.$('[data-action=life]').setAttribute('aria-pressed',String(enabled));
  const pause=this.$('[data-action=life-pause]');pause.hidden=!enabled;pause.textContent=paused?'Продолжить':'Пауза';pause.setAttribute('aria-pressed',String(paused));
  this.$('.life-note').hidden=!enabled;this.$('.life-note').textContent='Иллюстрация · не работа в реальном времени. Приблизьте карту, чтобы рассмотреть детали.';this.setAttribute('data-scene-state',enabled?(paused?'paused':'playing'):'off');
 }
 renderLifts(){
  const list=this.$('.lift-list');list.replaceChildren();
  const title=document.createElement('h3');title.textContent='Подъёмники';list.append(title);
  for(const f of this.data.lifts.features){const button=document.createElement('button');button.type='button';button.className='lift-row';button.textContent='↗ '+(f.properties.name||'Подъёмник')+' · '+(f.properties.tags?.aerialway==='chair_lift'?'кресельный':'тарелочный');button.addEventListener('click',()=>this.selectLift(f));list.append(button);}
 }
 selectLift(f){
  this.selected=null;this.renderList();this.highlight();const card=this.$('.card');card.replaceChildren();this.cardTitle(card,'Подъёмник',f.properties.name||'Подъёмник');
  this.text(card,f.properties.tags?.aerialway==='chair_lift'?'Кресельный подъёмник':'Тарельчатый бугельный подъёмник');this.text(card,'Текущий режим работы не подтверждён.');
  const b=document.createElement('button');b.type='button';b.className='show-trail';b.textContent='Показать подъёмник';b.addEventListener('click',()=>this.flyToFeatures([f],this.cameras[f.properties.slope]?.bearing||0));card.append(b);
  if(this.region)this.region.selectFeature('mratkino',null);else this.openPanel(true);
 }
 layoutLabels(){
  if(!this.map||!this.markers.length)return;
  const occupied=[];const width=this.map.getContainer().clientWidth,height=this.map.getContainer().clientHeight;
  const ordered=[...this.markers].sort((a,b)=>(b.id===this.selected?2:b.id==='summit'?1:0)-(a.id===this.selected?2:a.id==='summit'?1:0));
  for(const item of ordered){
   const point=this.map.project(item.marker.getLngLat());const w=item.element.offsetWidth||40,h=item.element.offsetHeight||24;
   const r={left:point.x-w/2-5,right:point.x+w/2+5,top:point.y-h-5,bottom:point.y+8};
   const outside=r.left<8||r.right>width-54||r.top<50||r.bottom>height-30;
   const overlaps=occupied.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top);
   const visible=(!this.region||item.id!=='summit'||this.$('[data-layer=labels]').checked)&&!item.regionalHidden&&!outside&&!overlaps;item.element.style.visibility=visible?'visible':'hidden';item.element.tabIndex=visible&&item.id!=='summit'?0:-1;
   if(visible)occupied.push(r);
  }
 }
 updateLayers(){
  if(!this.map?.getLayer('snow'))return;
  const local=!this.region||this.resortActive;
  for(const layer of ['trail-area','trail-area-edge','trail-line','trail-casing'])this.map.setLayoutProperty(layer,'visibility',local?'visible':'none');
  const legend=this.$('.legend');if(legend)legend.hidden=this.region?!this.region.visible.some(id=>id==='mratkino'||id==='abzakovo'):!local;
  const groups={lifts:['lift-line','lift-casing','lift-stations'],contours:['contours'],facilities:['facility-buildings','facility-points'],forest:['forest','forest-soft','region-forest']};
  for(const [name,layers] of Object.entries(groups)){const input=this.$(`[data-layer=${name}]`);for(const layer of layers)if(this.map.getLayer(layer))this.map.setLayoutProperty(layer,'visibility',input.checked&&(name==='forest'||local)?'visible':'none');}
  this.region?.layers();
  this.lifeScene?.setLayers({forest:this.$('[data-layer=forest]').checked,lifts:this.$('[data-layer=lifts]').checked});
  this.region?.hiking.nature?.setForest(this.$('[data-layer=forest]').checked);
 }
 updateViewButtons(){this.$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===this.view)));this.$('.view-label').textContent=this.view==='overview'?'ОБЩИЙ ВИД':this.view==='north'?'СЕВЕРНЫЙ СКЛОН':'ЮЖНЫЙ СКЛОН';}
 chooseView(view,animate=true){
  this.view=view;this.selected=null;const card=this.$('.card');card.replaceChildren();this.cardTitle(card,'ИССЛЕДУЙТЕ МРАТКИНО','Выберите трассу');this.text(card,'Нажмите на линию, подпись или название в списке.');this.updateViewButtons();this.renderList();this.highlight();
  if(!this.map?.getLayer('snow'))return;
  const preset=view==='overview'?{bounds:boundsFor(this.data.trails.features),bearing:this.cameras.south?.bearing||0,pitch:54}:this.cameras[view];
  if(preset)this.flyToBounds(preset.bounds,preset.bearing,preset.pitch,animate);
 }
 flyToFeatures(features,bearing){const bounds=boundsFor(features);if(bounds)this.flyToBounds(bounds,bearing,62,true);}
 flyToBounds(bounds,bearing,pitch,animate){
  const map=this.map;if(!map||!bounds)return;
  const mobile=matchMedia('(max-width:760px)').matches;
  const camera=map.cameraForBounds(bounds,{bearing,padding:mobile?{top:80,bottom:60,left:35,right:50}:{top:95,bottom:90,left:75,right:85},maxZoom:15.5});if(!camera)return;
  map.stop();map.easeTo({...camera,pitch:this.mode2D?0:pitch,bearing,duration:animate?this.duration():0,essential:false});
 }
 addMarkers(){
  this.markers.forEach(({marker})=>marker.remove());this.markers=[];
  for(const f of this.data.trails.features){
   if(!/^[ЮС][1-5]$/.test(f.properties.name)||f.geometry.type!=='LineString')continue;
   const element=document.createElement('button');element.type='button';element.className='route-label';element.textContent=f.properties.name;if(f.properties.name==='С1'){element.classList.add('closed-trail');element.title='Исторические сведения владельца; текущий статус не подтверждён';}element.setAttribute('aria-label','Трасса '+f.properties.name+', данные OSM, требуют сверки');element.setAttribute('aria-pressed','false');element.addEventListener('click',e=>{e.stopPropagation();this.selectTrail(f);});
   const points=coordinates(f.geometry);const marker=new this.ml.Marker({element,anchor:'center',occludedOpacity:0.25}).setLngLat(points[Math.floor(points.length/2)]).addTo(this.map);this.markers.push({marker,element,id:f.properties.id});
  }
  const element=document.createElement('span');element.className='summit-label';element.textContent='▲ Мраткино · OSM 795,1 м';const marker=new this.ml.Marker({element,anchor:'bottom',offset:[0,-8]}).setLngLat(SUMMIT).addTo(this.map);this.markers.push({marker,element,id:'summit'});
 }
}
if(!customElements.get('mratkino-map'))customElements.define('mratkino-map',MratkinoMap);
