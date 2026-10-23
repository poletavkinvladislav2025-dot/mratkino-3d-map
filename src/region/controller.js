import {PLACES,CITY,presetFor,byId,distanceKm} from './presets.js';
import {EMPTY} from '../map-data.js';
import {resortFacilities} from './style.js';
import {HikingController,hikingArea} from './hiking.js';
import {SkiAreaController} from './ski-area.js';
import {decoratePistes,CATEGORIES} from './piste-catalog.js';
import {visibleAreas} from './viewport.js';
import {IntegrationBridge,readURLState} from './integration.js';

/** Viewport data, explicit selection and optional heavy illustration are separate states. */
export class RegionController{
 constructor(host){
  this.host=host;this.initial=readURLState(location.search);this.id=this.initial.place;this.routeId=null;this.cardOpen=this.id!=='all'&&this.initial.card!==false;this.markers=[];this.pending=new Map();this.retryAfter=new Map();this.visible=[];this.viewportVisible=true;this.parentSuspended=false;
  try{this.effectsWanted=localStorage.getItem('vb3d-effects')==='1';}catch{this.effectsWanted=false;}
  if(this.initial.effects!==undefined)this.effectsWanted=this.initial.effects;
  this.hiking=new HikingController(host);this.ski=new SkiAreaController(host);this.bridge=new IntegrationBridge(this);
 }
 get effectsAllowed(){return this.effectsWanted&&!this.parentSuspended&&!document.hidden&&this.viewportVisible;}
 setup(){
  const h=this.host;h.$('.shell').classList.add('explorer');
  const nav=document.createElement('nav');nav.className='region-navigation';nav.setAttribute('aria-label','Управление картой');
  const brand=document.createElement('span');brand.className='explorer-brand';brand.textContent='visitbeloretsk';nav.append(brand);
  const label=document.createElement('label'),title=document.createElement('span');title.className='sr-only';title.textContent='Место на карте';label.append(title);
  const select=document.createElement('select');select.className='place-select';select.setAttribute('aria-label','Выбрать локацию');
  for(const p of [{id:'all',name:'Белорецкий район'},CITY,...PLACES]){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;select.append(o);}select.value=this.id;label.append(select);nav.append(label);select.addEventListener('change',()=>this.choose(select.value));
  const home=this.button('⌂','Общий вид района',()=>this.overview());home.className='map-home';nav.append(home);
  const layerButton=this.button('☷','Слои карты',()=>{const open=this.layerPanel.hidden;this.layerPanel.hidden=!open;layerButton.setAttribute('aria-expanded',String(open));});layerButton.dataset.action='layers';layerButton.setAttribute('aria-expanded','false');nav.append(layerButton);
  nav.append(h.$('[data-action=life]'));
  const about=h.$('.data-button');about.textContent='i';about.setAttribute('aria-label','О карте');nav.append(about);h.$('.toolbar').before(nav);
  const body=h.$('.panel-body'),local=document.createElement('div');local.className='resort-content';const layers=h.$('.layers');for(const c of [...body.children])if(c!==layers)local.append(c);body.prepend(local);
  const panel=document.createElement('section');panel.className='region-panel';panel.setAttribute('aria-live','polite');body.prepend(panel);
  const close=this.button('×','Закрыть карточку',()=>this.showCard(false));close.className='card-close';h.$('.sidebar').prepend(close);
  const layerPanel=document.createElement('section');layerPanel.className='layer-popover';layerPanel.hidden=true;layerPanel.setAttribute('aria-label','Слои карты');layerPanel.append(layers);h.$('.map-wrap').append(layerPanel);this.layerPanel=layerPanel;
  for(const [key,title,checked] of [['labels','Подписи',true],['paths','Тропы',false]]){const l=document.createElement('label'),s=document.createElement('span'),b=document.createElement('input');s.textContent=title;b.type='checkbox';b.dataset.layer=key;b.checked=checked;b.setAttribute('role','switch');b.addEventListener('change',()=>this.layers());l.append(s,b);layers.append(l);}
  h.$('[data-layer=forest]').closest('label').querySelector('span').textContent='Лес';
  h.$('[data-layer=contours]').closest('label').querySelector('span').textContent='Горизонтали';
  const legend=h.$('.legend');legend.replaceChildren();const heading=document.createElement('span');heading.className='legend-heading';heading.textContent='Сложность';legend.append(heading);
  for(const [key,text] of [['novice','Лёгкая'],['easy','Средняя'],['intermediate','Сложная'],['expert','Экспертная']]){const item=document.createElement('span'),dot=document.createElement('i');dot.style.background=CATEGORIES[key].color;item.append(dot,document.createTextNode(text));legend.append(item);}h.$('.map-wrap').append(legend);
  const routes=document.createElement('section');routes.className='routes-panel';const card=document.createElement('div');card.className='route-card';routes.append(card);body.append(routes);this.routesPanel=routes;
  this.about();
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Открыть свой GPX / GeoJSON';details.append(summary);const input=document.createElement('input');input.type='file';input.accept='.gpx,.geojson,.json';input.setAttribute('aria-label','Открыть GPX или GeoJSON');input.addEventListener('change',()=>this.importRoute(input.files?.[0]));details.append(input);h.$('dialog').append(details);
  this.hiking.setup();this.ski.setup();this.renderPlace();this.renderCard();
  h.$('.loading p').textContent='Открываем карту…';h.$('.map').setAttribute('aria-label','Трёхмерная карта Белорецкого района');
  h.shadowRoot.addEventListener('click',e=>{if(!layerPanel.contains(e.target)&&!layerButton.contains(e.target)){layerPanel.hidden=true;layerButton.setAttribute('aria-expanded','false');}},{signal:h.abort});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){this.showCard(false);layerPanel.hidden=true;}},{signal:h.abort});
  document.addEventListener('visibilitychange',()=>this.syncScene(),{signal:h.abort});
  this.observer=new IntersectionObserver(entries=>{this.viewportVisible=!!entries[0]?.isIntersecting;if(this.viewportVisible)h.map?.resize();this.syncScene();});this.observer.observe(h);
 }
 button(text,label,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.addEventListener('click',handler);return b;}
 about(){this.host.$('dialog').innerHTML=`<header><h2>О карте</h2><button type="button" data-action="close-dialog" aria-label="Закрыть">×</button></header>
  <p>Рельеф и география Южного Урала. Зимнее оформление постоянно; оно не показывает текущую погоду. Люди, движение подъёмников и сосны высотой 20–30 м — иллюстрация, а не наблюдение в реальном времени.</p>
  <h3>Трассы и точность</h3><p class="source-counts"></p><p>Линии и разрывы трасс сохранены из OpenStreetMap. Статусы открытия, паспортные длины и перепады без подтверждения не показаны. Ширина катания в Абзаково приблизительная, по просекам OSM; точных границ трасс нет.</p>
  <p>Абзаково: категории по <a href="https://abzakovo.com/scheme/" target="_blank" rel="noopener">официальной схеме</a>, проверенной 23.10.2026; дата выпуска не указана. №1, 7, 12 — синие; №2–4 — чёрные; №5, 8, 11, 13 — красные; №9, 10 — зелёные. Предварительный список задания с ней расходится. Спуск №6 на схеме отсутствует; оранжевая цифра 6 относится к подъёмнику.</p>
  <p>Мраткино: сложность по OSM, официальная классификация не подтверждена. У Ю3 конфликт name=Ю3 и ref=Ю2. Ю5 и спорная линия фрирайда не отображаются. С1 показана без катающихся и с молодыми елями по прежнему описанию владельца; актуальный режим работы неизвестен. Кресла трёхместные по описанию владельца, в OSM указано четыре места — требуется сверка.</p>
  <p>Пешие треки Малиновой и Ялангаса построены по сети OSM и требуют проверки на местности. Они не подтверждают разрешение прохода. Для Ямантау и Малого Ямантау действуют ограничения заповедника. Собственные файлы GPX / GeoJSON открываются локально и не отправляются на сервер.</p>
  <h3>Управление</h3><p>Перетаскивание — перемещение; правая кнопка мыши — поворот и наклон; колесо — масштаб. На телефоне используйте два пальца. Кнопка 2D / 3D меняет наклон, компас сбрасывает поворот. «Оживление» включает условные деревья и отдыхающих; настройка сохраняется между местами. При уменьшении движения в системе анимация приостановлена.</p>
  <h3>Источники</h3><p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, ODbL 1.0 · <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> / OpenMapTiles · <a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">Mapterhorn, источники рельефа</a>. Преувеличение высот 1. Автономный рельеф: Copernicus DEM GLO-30 (около 30 м), © DLR e.V. 2010–2014 / Airbus Defence and Space GmbH 2014–2018, предоставлен ЕС и ESA. MapLibre GL JS — BSD-3-Clause.</p>`;}
 preset(){return presetFor(this.id);}
 async bootstrap(){
  const h=this.host;await this.choose(this.id,false,{silent:true,initial:true});
  if(this.initial.route)await this.openRoute(this.initial.route,{silent:true,focus:!this.initial.camera});
  if(this.initial.camera)h.map.jumpTo(this.initial.camera);
  this.sync();this.bootstrapped=true;this.bridge.tryReady();
 }
 async choose(id,animate=true,meta={}){
  if(id!=='all'&&!byId(id))throw Error('UNKNOWN_PLACE');
  const h=this.host;this.id=id;this.routeId=null;this.importActive=false;h.selected=null;h.setAttribute('data-place',id);h.removeAttribute('data-route');h.$('.place-select').value=id;this.cardOpen=id!=='all'&&(meta.initial?this.initial.card!==false:true);this.renderPlace();this.renderCard();
  if(!h.map?.getLayer('snow'))return;
  h.highlight();if(this.ski.data){this.ski.selectedIds([]);this.ski.card?.replaceChildren();}this.hiking.selected=null;this.hiking.card.replaceChildren();
  if(meta.navigate!==false){h.map.stop();if(id==='all')this.overview(animate);else{const p=this.preset();h.mode2D=p.pitch<10;h.map.easeTo({center:p.center,zoom:p.zoom,pitch:p.pitch,bearing:p.bearing,duration:animate?h.duration():0});}}
  if(!meta.silent)this.bridge.event('placeSelected',{placeId:id});
  this.bridge.updateURL();
  try{if(id==='mratkino')await this.ensureResort();else if(id==='abzakovo')await this.ski.ensure();else if(hikingArea(id))await this.hiking.enter(id);}catch(e){this.dataError(e,'Данные места временно недоступны.');}
  this.sync();
 }
 overview(animate=true){const h=this.host;if(!h.map)return;const p=presetFor('all'),camera=h.map.cameraForBounds(p.bounds,{padding:45,bearing:p.bearing});h.map.stop();h.map.easeTo({...camera,pitch:p.pitch,bearing:p.bearing,duration:animate?h.duration():0});}
 renderPlace(){
  const h=this.host,p=byId(this.id),card=h.$('.region-panel');if(!card)return;card.replaceChildren();h.$('h1').textContent=p?.name||'Белорецкий район';
  h.cardTitle(card,p?.kind==='resort'?'Горнолыжный комплекс':p?.kind==='city'?'Южный Урал':'Белорецкий район',p?.name||'Ваш маршрут');
  if(p?.kind==='resort')h.text(card,'Трассы, подъёмники и горный лес.');
  else if(p?.kind==='city')h.text(card,'Город у подножия уральских гор.');
  else if(p)h.text(card,p.kind==='peak'?'Горная вершина Южного Урала.':'Природная локация Белорецкого района.');
  if(p?.elevation)h.text(card,`Высота по OSM: ${p.elevation.toLocaleString('ru-RU')} м.`);
  if(p?.access)h.text(card,p.access,'access-note');
  const page=['malinovaya','malinovaya-3'].includes(this.id)?'https://visitbeloretsk.ru/malinovaya':this.id==='yalangas'?'https://www.visitbeloretsk.ru/yalangas':null;
  if(page){const a=document.createElement('a');a.href=page;a.target='_blank';a.rel='noopener';a.textContent='О месте ↗';card.append(a);}
 }
 renderCard(){
  const h=this.host;if(!h.$('.sidebar'))return;h.$('.sidebar').hidden=!this.cardOpen;h.setAttribute('data-card-open',String(this.cardOpen));
  h.$('.region-panel').hidden=this.importActive;h.$('.resort-content').hidden=this.importActive||this.id!=='mratkino'||!h.resortLoaded;
  this.ski.panel.hidden=this.importActive||this.id!=='abzakovo';this.hiking.section.hidden=this.importActive||!hikingArea(this.id);this.routesPanel.hidden=!this.importActive;
 }
 showCard(open){this.cardOpen=open;this.renderCard();this.bridge.updateURL();}
 selectFeature(place,routeId,meta={}){
  const h=this.host;const placeChanged=this.id!==place;this.id=place;this.routeId=routeId;this.importActive=false;this.cardOpen=true;h.setAttribute('data-place',place);h.$('.place-select').value=place;
  if(routeId)h.setAttribute('data-route',routeId);else h.removeAttribute('data-route');
  if(place!=='mratkino'){h.selected=null;h.highlight();}if(place!=='abzakovo'&&this.ski.data)this.ski.selectedIds([]);
  this.renderPlace();this.renderCard();this.hiking.draw();this.bridge.updateURL();
  if(!meta.silent){if(placeChanged)this.bridge.event('placeSelected',{placeId:place});if(routeId)this.bridge.event('routeSelected',{placeId:place,routeId});}
 }
 async openRoute(id,meta={}){
  if(id.startsWith('abzakovo/trail/')){const n=id.split('/')[2];await this.ski.ensure();if(!this.ski.selectTrail(n,meta))throw Error('UNKNOWN_ROUTE');if(meta.focus)this.ski.fit(this.ski.data.trails.features.filter(f=>f.properties.number===n));return;}
  if(id.startsWith('mratkino/trail/')){await this.ensureResort();const slug=id.split('/')[2],m=/^(south|north)-([1-4])$/.exec(slug),name=m?(m[1]==='south'?'Ю':'С')+m[2]:null;const f=this.host.data.trails.features.find(f=>f.geometry.type==='LineString'&&f.properties.name===name);if(!f)throw Error('UNKNOWN_ROUTE');this.host.selectTrail(f,false,meta);if(meta.focus)this.host.flyToFeatures([f],this.host.cameras[f.properties.slope]?.bearing||0);return;}
  if(!await this.hiking.open(id,meta))throw Error('UNKNOWN_ROUTE');
 }
 async ensureResort(){
  const h=this.host;if(h.resortLoaded)return;
  if(!this.resortPromise)this.resortPromise=(async()=>{
   const names=['trails','lifts','stations','forest','roads','facilities','contours'],values=await Promise.all(names.map(n=>h.json(n==='facilities'?'region/mratkino-facilities.geojson':'live/'+n+'.geojson')));if(h.abort.aborted)return;
   h.data={...h.data,...Object.fromEntries(names.map((n,i)=>[n,values[i]]))};h.data.trails=decoratePistes('mratkino',h.data.trails);h.resortLoaded=true;h.applyResortData();
   if(h.map?.getSource('trails')){
    for(const n of names)h.map.getSource(n)?.setData(n==='facilities'?resortFacilities(h.data):h.data[n]);
    if(!h.map.getSource('forest-winter')){const [w,s,e,n]=h.data.manifest.bounds;h.map.addSource('forest-winter',{type:'image',url:h.url('live/forest-winter.png'),coordinates:[[w,n],[e,n],[e,s],[w,s]]});h.map.addLayer({id:'forest-soft',type:'raster',source:'forest-winter',paint:{'raster-opacity':1,'raster-fade-duration':0}},'road');}
    h.addMarkers();
   }
   this.renderCard();
  })().catch(e=>{this.resortPromise=null;throw e;});return this.resortPromise;
 }
 request(id,load){
  if(this.pending.has(id)||Date.now()<(this.retryAfter.get(id)||0))return;
  const map=this.host.map;const p=load().catch(e=>{this.retryAfter.set(id,Date.now()+30000);this.dataError(e,'Часть маршрутов временно недоступна.');}).finally(()=>{this.pending.delete(id);if(this.host.map===map&&!this.host.abort.aborted)this.sync();});this.pending.set(id,p);
 }
 sync(){
  const h=this.host,map=h.map;if(!map?.getLayer('snow'))return;this.visible=visibleAreas(map);h.setAttribute('data-visible-areas',this.visible.join(','));h.setAttribute('data-active-zones',this.visible.join(','));
  if(this.visible.includes('mratkino')&&!h.resortLoaded)this.request('mratkino',()=>this.ensureResort());
  if(this.visible.includes('abzakovo')&&!this.ski.data)this.request('abzakovo',()=>this.ski.ensure());
  const hiking=this.visible.filter(id=>id==='malinovaya'||id==='yalangas');
  this.hiking.visible=new Set(hiking);for(const area of hiking)if(!this.hiking.datasets.has(area))this.request(area,()=>this.hiking.ensure(area));
  this.hiking.draw();h.resortActive=this.visible.includes('mratkino')&&h.resortLoaded;this.ski.sync(this.visible.includes('abzakovo')&&!!this.ski.data);
  for(const m of h.markers)m.regionalHidden=!h.resortActive;
  const contexts=this.visible.filter(id=>id==='mratkino'?h.resortLoaded:id==='abzakovo'?!!this.ski.data:this.hiking.datasets.has(id));contexts.sort((a,b)=>distanceKm(map.getCenter().toArray(),byId(a).coordinates)-distanceKm(map.getCenter().toArray(),byId(b).coordinates));
  const context=contexts[0]||null;if(this.context!==context){this.context=context;this.disposeScenes();}this.hiking.contextArea=['malinovaya','yalangas'].includes(context)?context:null;
  h.updateLayers();h.$('.legend').hidden=!this.visible.some(id=>['abzakovo','mratkino'].includes(id));h.$('.legend').title=this.visible.includes('mratkino')?'Мраткино: сложность по OSM, не подтверждена курортом':'Абзаково: категории по официальной схеме';
  this.renderCard();this.syncScene();this.layoutLabels();
 }
 async toggleEffects(){this.effectsWanted=!this.effectsWanted;try{localStorage.setItem('vb3d-effects',this.effectsWanted?'1':'0');}catch{}this.bridge.updateURL();await this.syncScene();}
 disposeScenes(){this.host.disposeLife();this.ski.disposeScene();this.hiking.disposeNature();}
 async syncScene(){
  const h=this.host;if(!this.effectsAllowed){this.disposeScenes();this.reflectLife();return;}if(this.scenePending||h.getAttribute('data-map-state')!=='ready')return;
  const context=this.context;if(!context){this.reflectLife();return;}this.scenePending=true;
  try{if(context==='mratkino'&&!h.lifeScene)await h.toggleLife(true,true);else if(context==='abzakovo'&&!this.ski.scene)await this.ski.toggleLife(true);else if(this.hiking.active&&!this.hiking.enabled)await this.hiking.toggleLife(true);}
  finally{this.scenePending=false;this.reflectLife();if(this.context!==context&&this.effectsAllowed)this.syncScene();}
 }
 reflectLife(){const h=this.host,b=h.$('[data-action=life]');if(!b)return;b.disabled=false;b.textContent='Оживление';b.setAttribute('role','switch');b.setAttribute('aria-checked',String(this.effectsWanted));b.setAttribute('aria-pressed',String(this.effectsWanted));b.title=matchMedia('(prefers-reduced-motion: reduce)').matches?'Иллюстрация; движение уменьшено настройкой устройства':'Условные люди, подъёмники и деревья';h.$('[data-action=life-pause]').hidden=true;h.$('.life-note').hidden=true;const scene=h.lifeScene||this.ski.scene;h.setAttribute('data-scene-state',this.hiking.enabled?'nature':scene?(scene.paused?'paused':'playing'):'off');}
 suspend(value){this.parentSuspended=value;if(value)this.host.map?.stop();else{this.host.map?.resize();this.sync();}this.syncScene();}
 resetMap(){
  const h=this.host,c=this.bridge.snapshot();this.initial={place:this.id,route:this.routeId,card:this.cardOpen,effects:this.effectsWanted,camera:c?{...c,center:[c.center.lng,c.center.lat]}:this.initial.camera};
  this.bootstrapped=false;this.bridge.reset();this.disposeScenes();this.ski.dispose();this.ski.data=null;this.ski.promise=null;this.hiking.dispose();this.hiking.datasets.clear();this.hiking.boundMap=null;
  this.markers.forEach(m=>m.marker.remove());this.markers=[];h.markers.forEach(m=>m.marker.remove());h.markers=[];h.resortLoaded=false;this.resortPromise=null;this.context=null;this.pending.clear();this.retryAfter.clear();
 }
 dataError(error,message='Часть карты временно недоступна.') {if(error?.name==='AbortError')return;const h=this.host,note=h.$('.error-note');note.hidden=false;note.textContent=message;const retry=this.button('Повторить','Повторить загрузку объектов',()=>{note.hidden=true;this.retryAfter.clear();this.sync();const area=hikingArea(this.id);if(area)this.request(area,()=>this.hiking.enter(this.id));else if(this.id==='abzakovo')this.request(this.id,()=>this.ski.ensure());else if(this.id==='mratkino')this.request(this.id,()=>this.ensureResort());});note.append(retry);this.bridge.event('error',{code:'DATA_UNAVAILABLE',message,recoverable:true});}
 addLabels(){const h=this.host;this.markers.forEach(m=>m.marker.remove());this.markers=[];for(const p of PLACES){const element=this.button((p.kind==='peak'?'▲ ':'')+p.name,'Приблизить: '+p.name,()=>this.choose(p.id));element.className='place-label';const marker=new h.ml.Marker({element,anchor:'bottom',occludedOpacity:.15}).setLngLat(p.coordinates).addTo(h.map);this.markers.push({p,element,marker});}}
 layoutLabels(){const h=this.host,map=h.map;if(!map)return;this.ski.layoutLabels();const enabled=h.$('[data-layer=labels]').checked,zoom=map.getZoom(),w=map.getContainer().clientWidth,hh=map.getContainer().clientHeight,occupied=[];for(const {p,element} of this.markers){const point=map.project(p.coordinates),width=element.offsetWidth||110,r=[point.x-width/2-5,point.y-30,point.x+width/2+5,point.y+5];const visible=enabled&&!(h.resortActive&&p.id==='mratkino')&&!(this.ski.active&&p.id==='abzakovo')&&(zoom>=10.6||p.major||p.id===this.id)&&r[0]>=8&&r[2]<=w-48&&r[1]>=55&&r[3]<=hh-65&&!occupied.some(a=>r[0]<a[2]&&r[2]>a[0]&&r[1]<a[3]&&r[3]>a[1]);element.style.visibility=visible?'visible':'hidden';element.tabIndex=visible?0:-1;if(visible)occupied.push(r);}}
 layers(){const h=this.host;if(!h.map?.getLayer('snow'))return;h.map.setLayoutProperty('region-paths','visibility',h.$('[data-layer=paths]').checked?'visible':'none');this.ski.layers();this.layoutLabels();}
 async importRoute(file){
  if(!file)return;const h=this.host,card=h.$('.route-card');card.replaceChildren();
  try{if(file.size>5*1024*1024)throw Error('Максимальный размер — 5 МБ');const {parseGPX,normalizeRoutes,routeMetrics,routeEndpoints}=await import('./routes.js');const text=await file.text(),data=/\.gpx$/i.test(file.name)?parseGPX(text):normalizeRoutes(JSON.parse(text)),metrics=routeMetrics(data);this.routeData=data;this.importActive=true;
   h.map.getSource('touring-routes').setData({...data,features:data.features.filter(f=>f.geometry.type!=='Point')});h.map.getSource('route-stops').setData(routeEndpoints(data));h.cardTitle(card,'Ваш файл · не проверен',data.features.find(f=>f.geometry.type!=='Point').properties.name);h.text(card,`≈ ${metrics.lengthKm.toFixed(1)} км${metrics.gainM===null?'':` · набор ≈ ${metrics.gainM} м`}`);
   const show=this.button('Показать трек','Показать трек',()=>h.flyToFeatures(data.features,h.map.getBearing()));card.append(show);const remove=this.button('Убрать трек','Убрать трек',()=>{h.map.getSource('touring-routes').setData(EMPTY);h.map.getSource('route-stops').setData(EMPTY);this.routeData=null;this.importActive=false;this.showCard(false);card.replaceChildren();});card.append(remove);h.$('dialog').close();this.showCard(true);show.click();
  }catch(e){h.text(card,'Трек не открыт: '+e.message);this.importActive=true;this.showCard(true);}
 }
 dispose(){this.bridge.dispose();this.observer?.disconnect();this.hiking.dispose();this.ski.dispose();this.host.disposeLife();this.markers.forEach(m=>m.marker.remove());}
}
