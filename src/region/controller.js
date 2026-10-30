import {CatalogLifeController} from './catalog-life.js';
import {ROCK_SURFACES} from '../landscape/malinovaya-rock-plan.js';
import {rodeoMask,rodeoFrame} from '../landscape/rodeo-plan.js';
import {placeKind} from './card-content.js';
import {PLACES,CITY,presetFor,byId,distanceKm} from './presets.js';
import {EMPTY,boundsFor} from '../map-data.js';
import {resortFacilities} from './style.js';
import {HikingController,hikingArea} from './hiking.js';
import {SkiAreaController} from './ski-area.js';
import {decoratePistes} from './piste-catalog.js';
import {visibleAreas} from './viewport.js';
import {IntegrationBridge,readURLState} from './integration.js';
import {LandscapeController} from '../landscape/controller.js';
import {LINE_LOD} from '../landscape/config.js';
import {CatalogController} from './catalog-controller.js';
import {placeVisible} from './passport.js';
import {renderPassportContent} from './passport-cards.js';
import {applyFilters,filterSnapshot} from './filters.js';
import {PlaceGallery} from './gallery.js';
import {LongDistanceController} from './long-distance.js';
import {MAP_ICONS} from '../map-icons.js';
import {CAMERA_CONTROL} from '../map-interaction.js';
import {KrakaController} from './kraka.js';

/** Viewport data, explicit selection and optional heavy illustration are separate states. */
export class RegionController{
 constructor(host){
  this.host=host;this.initial=readURLState(location.search);this.id=this.initial.place;this.routeId=null;this.cardOpen=this.id!=='all'&&this.initial.card!==false;this.markers=[];this.pending=new Map();this.retryAfter=new Map();this.visible=[];this.viewportVisible=true;this.parentSuspended=false;
  try{this.effectsWanted=localStorage.getItem('vb3d-effects')==='1';this.motionExplicit=this.effectsWanted;}catch{this.effectsWanted=false;}
  if(this.initial.effects!==undefined)this.effectsWanted=this.initial.effects;
  this.filters={ski:true,nordic:true,hiking:true,interesting:true,stamps:true,passport:false};this.motionExplicit=!!this.motionExplicit;this.season='winter';this.landscape=new LandscapeController(this);this.catalog=new CatalogController(this);this.catalogLife=new CatalogLifeController(this);
  this.longDistance=new LongDistanceController(this);this.kraka=new KrakaController(this);this.hiking=new HikingController(host);this.ski=new SkiAreaController(host);this.bridge=new IntegrationBridge(this);
 }
 get sceneVisible(){return !this.parentSuspended&&!document.hidden&&this.viewportVisible;}
 get effectsAllowed(){return !this.cameraMoving&&!this.host.map?.isMoving()&&this.effectsWanted&&(!matchMedia('(prefers-reduced-motion: reduce)').matches||this.motionExplicit)&&!this.parentSuspended&&!document.hidden&&this.viewportVisible;}
 setup(){
  const h=this.host;h.$('.map').setAttribute('aria-label','Интерактивная карта Visit Beloretsk');h.$('.shell').classList.add('explorer');this.embedded=new URLSearchParams(location.search).get('embed')==='1';h.$('.shell').classList.toggle('embedded',this.embedded);this.gallery=new PlaceGallery(this);
  const nav=document.createElement('nav');nav.className='region-navigation';nav.setAttribute('aria-label','Управление картой');
  const brand=document.createElement('span');brand.className='explorer-brand';brand.textContent='visitbeloretsk';nav.append(brand);
  const label=document.createElement('label'),title=document.createElement('span');title.className='sr-only';title.textContent='Место на карте';label.append(title);
  const select=document.createElement('select');select.className='place-select';select.setAttribute('aria-label','Выбрать локацию');
  for(const p of [{id:'all',name:'Белорецкий район'},CITY,...PLACES]){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;select.append(o);}select.value=this.id;label.append(select);label.className='sr-only';nav.append(label);select.addEventListener('change',()=>this.choose(select.value));
  const search=this.button('⌕ Найти место','Поиск мест',()=>{this.searchPanel.hidden=!this.searchPanel.hidden;search.setAttribute('aria-expanded',String(!this.searchPanel.hidden));this.layerPanel.hidden=true;layerButton.setAttribute('aria-expanded','false');if(!this.searchPanel.hidden)this.searchInput.focus();});search.className='search-toggle';search.innerHTML=MAP_ICONS.search+'<span>Найти место</span>';search.setAttribute('aria-expanded','false');this.searchToggle=search;nav.append(search);
  const home=this.button('⌂','Общий вид района',()=>this.overview());home.className='map-home';home.innerHTML=MAP_ICONS.home;nav.append(home);
  const layerButton=this.button('☷','Слои карты',()=>{this.searchPanel.hidden=true;search.setAttribute('aria-expanded','false');const open=this.layerPanel.hidden;this.layerPanel.hidden=!open;layerButton.setAttribute('aria-expanded',String(open));});layerButton.innerHTML=MAP_ICONS.layers;this.layerButton=layerButton;layerButton.dataset.action='layers';layerButton.setAttribute('aria-expanded','false');nav.append(layerButton);
  nav.append(h.$('[data-action=life]'));
  const about=h.$('.data-button');about.innerHTML=MAP_ICONS.info;about.setAttribute('aria-label','О карте');about.title='О карте';nav.append(about);h.$('.toolbar').before(nav);
  const body=h.$('.panel-body'),local=document.createElement('div');local.className='resort-content';const layers=h.$('.layers');for(const c of [...body.children])if(c!==layers)local.append(c);body.prepend(local);
  const panel=document.createElement('section');panel.className='region-panel';panel.setAttribute('aria-live','polite');body.prepend(panel);
  const close=this.button('×','Закрыть карточку',()=>this.showCard(false));close.className='card-close';h.$('.sidebar').prepend(close);const collapse=this.button('−','Свернуть карточку',()=>{const collapsed=h.$('.sidebar').classList.toggle('collapsed');collapse.textContent=collapsed?'+':'−';collapse.setAttribute('aria-label',collapsed?'Развернуть карточку':'Свернуть карточку');collapse.title=collapse.getAttribute('aria-label');this.resizeLayout(true);});collapse.className='card-collapse';close.after(collapse);
  const layerPanel=document.createElement('section');layerPanel.className='layer-popover';layerPanel.hidden=true;layerPanel.setAttribute('aria-label','Слои карты');layerPanel.append(layers);h.$('.map-wrap').append(layerPanel);this.layerPanel=layerPanel;this.setupSearch();
  h.shadowRoot.addEventListener('pointerdown',e=>{if(!this.searchPanel.contains(e.target)&&!search.contains(e.target)){this.searchPanel.hidden=true;search.setAttribute('aria-expanded','false');}if(!layerPanel.contains(e.target)&&!layerButton.contains(e.target)){layerPanel.hidden=true;layerButton.setAttribute('aria-expanded','false');}},{signal:h.abort});
  h.shadowRoot.addEventListener('keydown',e=>{if(e.key!=='Escape'||h.shadowRoot.querySelector('dialog[open]'))return;if(!this.searchPanel.hidden){this.searchPanel.hidden=true;search.setAttribute('aria-expanded','false');search.focus();e.stopPropagation();}else if(!layerPanel.hidden){layerPanel.hidden=true;layerButton.setAttribute('aria-expanded','false');layerButton.focus();e.stopPropagation();}},{signal:h.abort});
  const categories=document.createElement('fieldset');categories.className='category-filters';const caption=document.createElement('legend');caption.textContent='Показать на карте';categories.append(caption);for(const [id,text] of [['ski','Горнолыжные центры'],['nordic','Беговые лыжи'],['hiking','Туристические маршруты'],['interesting','Места'],['stamps','Где поставить штамп'],['passport','Где купить паспорт']]){const l=document.createElement('label'),b=document.createElement('input');b.type='checkbox';b.checked=this.filters[id];b.dataset.category=id;b.addEventListener('change',()=>{this.setFilters({[id]:b.checked});});l.dataset.filterId=id;l.append(document.createTextNode(text),b);categories.append(l);}layerPanel.prepend(categories);const seasonLabel=document.createElement('label');seasonLabel.className='season-control';seasonLabel.textContent='Оформление';const season=document.createElement('select');season.setAttribute('aria-label','Сезон карты');for(const [id,text] of [['winter','Зима'],['summer','Лето']]){const o=document.createElement('option');o.value=id;o.textContent=text;season.append(o);}season.addEventListener('change',()=>{this.season=season.value;this.applySeason();});seasonLabel.append(season);layerPanel.append(seasonLabel);this.longDistance.setup(layerPanel);
  for(const [key,title,checked] of [['labels','Подписи',true],['paths','Тропы',false]]){const l=document.createElement('label'),s=document.createElement('span'),b=document.createElement('input');s.textContent=title;b.type='checkbox';b.dataset.layer=key;b.checked=checked;b.setAttribute('role','switch');b.addEventListener('change',()=>this.layers());l.append(s,b);layers.append(l);}
  h.$('[data-layer=forest]').closest('label').querySelector('span').textContent='Лес';
  h.$('[data-layer=contours]').closest('label').querySelector('span').textContent='Горизонтали';
  const status=document.createElement('p');status.className='map-status';status.hidden=true;status.setAttribute('role','status');status.textContent='Подгружаем детали…';h.$('.map-wrap').append(status);this.loadStatus=status;
  h.$('.legend').hidden=true;h.$('.legend').replaceChildren();
  const routes=document.createElement('section');routes.className='routes-panel';const card=document.createElement('div');card.className='route-card';routes.append(card);body.append(routes);this.routesPanel=routes;
  this.about();this.cameraButton();
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Открыть свой GPX / GeoJSON';details.append(summary);const input=document.createElement('input');input.type='file';input.accept='.gpx,.geojson,.json';input.setAttribute('aria-label','Открыть GPX или GeoJSON');input.addEventListener('change',()=>this.importRoute(input.files?.[0]));details.append(input);h.$('dialog').append(details);
  this.hiking.setup();this.ski.setup();this.catalog.setup();this.renderPlace();this.renderCard();
  h.$('.loading p').textContent='Открываем карту…';h.$('.map').setAttribute('aria-label','Трёхмерная карта Белорецкого района');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!h.shadowRoot.querySelector('dialog[open]')){this.showCard(false);layerPanel.hidden=true;}},{signal:h.abort});
  document.addEventListener('visibilitychange',()=>this.sync(),{signal:h.abort});
  this.observer=new IntersectionObserver(entries=>{this.viewportVisible=!!entries[0]?.isIntersecting;if(this.viewportVisible){h.map?.resize();this.sync();}else{this.landscape.sync();this.syncScene();this.updateLoadStatus();}});this.observer.observe(h);
 }
 button(text,label,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.title=label;b.addEventListener('click',handler);return b;}
 setFilters(patch,{silent=false}={}){
  const next=applyFilters(this.filters,patch),changed=JSON.stringify(next)!==JSON.stringify(this.filters);this.filters=next;if(this.host.map?.getLayer('malinovaya-rock-surface'))this.host.map.setLayoutProperty('malinovaya-rock-surface','visibility',next.interesting&&next.hiking?'visible':'none');
  for(const input of this.host.shadowRoot.querySelectorAll('[data-category]'))input.checked=next[input.dataset.category];
  this.renderSearch?.();const selected=byId(this.id);if(selected&&!placeVisible(selected,next))this.cardOpen=false;this.sync();if(changed&&!silent)this.bridge.event('filtersChanged',{filters:filterSnapshot(next)});
 }
 /** Explicit visitor action: reset the old selection, filter and frame this view. */
 async focusView(view,{silent=false}={}){
  this.setFilters({view},{silent});
  await this.choose('all',false,{silent:true,navigate:false});
  const h=this.host;this.showCard(false);h.map.resize();h.map.stop();
  if(view==='places'){this.overview(false);return;}
  const points=PLACES.filter(p=>p.kind==='stamp-point'&&placeVisible(p,this.filters));
  if(!points.length)return;
  const bounds=points.reduce((b,p)=>[[Math.min(b[0][0],p.coordinates[0]),Math.min(b[0][1],p.coordinates[1])],[Math.max(b[1][0],p.coordinates[0]),Math.max(b[1][1],p.coordinates[1])]],[[Infinity,Infinity],[-Infinity,-Infinity]]);
  const container=h.map.getContainer(),compact=container.clientWidth<440||container.clientHeight<480;
  // Fit insets shape this view without persisting padding across responsive resizes.
  h.map.fitBounds(bounds,{padding:compact?{top:80,bottom:120,left:32,right:72}:{top:100,bottom:110,left:80,right:100},maxZoom:15.5,pitch:compact?15:35,bearing:0,duration:0});
  this.sync();this.cameraButton();this.bridge.updateURL();
 }
 cameraButton(){const m=this.host.map,top=m?m.getPitch()<5:this.host.mode2D,b=this.host.$('[data-action=mode]');this.host.mode2D=top;b.textContent=top?'Наклонный вид':'Вид сверху';b.title=b.textContent;b.setAttribute('aria-label',b.textContent);b.setAttribute('aria-pressed',String(top));}
 cameraPadding(){const h=this.host,s=h.$('.sidebar');if(!this.cardOpen)return {top:0,bottom:0,left:0,right:0};return matchMedia('(max-width:760px)').matches?{top:12,left:12,right:12,bottom:Math.min(s.offsetHeight+20,h.$('.map-wrap').clientHeight*.48)}:{top:20,left:24,right:Math.min(s.offsetWidth+100,h.$('.map-wrap').clientWidth*.48),bottom:30};}
 resizeLayout(force=false,initial=false){
  const h=this.host,map=h.map,wrap=h.$('.map-wrap'),nav=h.$('.region-navigation');if(!map||!wrap||!nav)return;
  h.$('.shell').style.setProperty('--vb-toolbar-height',nav.offsetHeight+'px');if(!this.bootstrapped)return;
  const size=[wrap.clientWidth,wrap.clientHeight],same=this.layoutSize?.every((n,i)=>n===size[i]);this.layoutSize=size;
  if(initial){this.resizePending=false;return;}if(same&&!force)return;
  if(map.isMoving()){this.resizePending=true;return;}
  const padding=this.cameraPadding(),current=map.getPadding();if(Object.keys(padding).some(k=>Math.abs(current[k]-padding[k])>.5))map.setPadding(padding);
  this.layoutLabels();
 }
 // Route names belong to the clicked feature; keep the former bottom strip empty.
 refreshLegend(){const legend=this.host.$('.legend');if(legend){legend.hidden=true;legend.replaceChildren();}}
 applySeason(){const m=this.host.map;if(!m?.getLayer('snow'))return;m.setPaintProperty('snow','background-color',this.season==='summer'?'#d3d8bd':'#edf2ec');if(m.getLayer('region-surfaces'))m.setPaintProperty('region-surfaces','fill-opacity',this.season==='summer'?.72:.48);this.landscape.scene?.setSeason(this.season);}
 setupSearch(){const h=this.host,p=document.createElement('section');p.className='place-search';p.hidden=true;const input=document.createElement('input');input.type='search';input.placeholder='Название места';input.setAttribute('aria-label','Поиск по названию');const list=document.createElement('div');list.className='search-results';const render=()=>{list.replaceChildren();for(const place of [CITY,...PLACES].filter(p=>p.coordinates&&placeVisible(p,this.filters)&&(p.name+' '+(p.address||'')).toLocaleLowerCase('ru').includes(input.value.toLocaleLowerCase('ru')))){const b=this.button(place.name,place.name,()=>{p.hidden=true;this.searchToggle.setAttribute('aria-expanded','false');this.choose(place.id);});list.append(b);}};input.addEventListener('input',render);p.append(input,list);h.$('.shell').append(p);this.searchPanel=p;this.searchInput=input;this.renderSearch=render;render();}
 about(){this.host.$('dialog').innerHTML=`<header><h2>О карте</h2><button type="button" data-action="close-dialog" aria-label="Закрыть">×</button></header>
  <p>Рельеф и география Южного Урала. Зимнее оформление постоянно; оно не показывает текущую погоду. Люди, движение подъёмников и сосны высотой 20–30 м — иллюстрация, а не наблюдение в реальном времени.</p>
  <h3>Трассы и точность</h3><p class="source-counts"></p><p>Линии и разрывы трасс сохранены из OpenStreetMap. Статусы открытия, паспортные длины и перепады без подтверждения не показаны. Ширина катания в Абзаково приблизительная, по просекам OSM; точных границ трасс нет.</p>
  <p>Абзаково: категории по <a href="https://abzakovo.com/scheme/" target="_blank" rel="noopener">официальной схеме</a>, проверенной 23.10.2026; дата выпуска не указана. №1, 7, 12 — синие; №2–4 — чёрные; №5, 8, 11, 13 — красные; №9, 10 — зелёные. Предварительный список задания с ней расходится. Официальный сайт описывает 10 трасс и 13 км, схема содержит другую нумерацию; причина различий не установлена. Спуск №6 на схеме отсутствует; оранжевая цифра 6 относится к подъёмнику.</p>
  <p>Мраткино: цвета по таблице схемы из задания владельца, официальная классификация не подтверждена. Фотография схемы не приложена. У Ю3 конфликт name=Ю3 и ref=Ю2. Ю5 и спорная линия фрирайда не отображаются. С1 — чёрная, закрыта и не обслуживается; показана без катающихся. Ю1, Ю2, Ю3 и С3 — красные; С2 — чёрная. Кресла трёхместные по описанию владельца, в OSM указано четыре места — требуется сверка.</p>
  <p>Пешие треки Малиновой и Ялангаса построены по сети OSM и требуют проверки на местности. Они не подтверждают разрешение прохода. Для Ямантау и Малого Ямантау действуют ограничения заповедника. Собственные файлы GPX / GeoJSON открываются локально и не отправляются на сервер.</p>
  <p>Большие маршруты GPX: Большая Уральская тропа показана красным, Южноуральская тропа — жёлтым. Все участки перенесены из файлов владельца без соединения разрывов. БУТ содержит ветки; суммарная длина не означает длину единой прогулки. Название открывается нажатием на линию. Полный охват доступен в слоях кнопкой «Целиком».</p>
  <p>Родео-парк: подушка, трамплины, фигуры и трюки — художественная сцена по описанию проекта, не съёмка реального расположения оборудования.</p><p>Водонапорная башня Белорецка — приближённая 3D-модель по изображению из карточки: кирпичный ствол, деревянный восьмигранный верх, крыша и фонарь. Пропорции и детали условны.</p><p>Скалы Первой Малиновой следуют линии обрыва OpenStreetMap, сопоставленной со спутниковым снимком. Высота, трещины и отдельные блоки — приближённая иллюстрация по фотографиям.</p><h3>Управление</h3><p>Перетаскивание — перемещение; правая кнопка мыши — поворот и наклон; колесо — масштаб. На телефоне используйте два пальца. Кнопка 2D / 3D меняет наклон, компас сбрасывает поворот. Статичный лес, сооружения и трассы появляются автоматически. «Оживить карту» включает движение и объём зданий; выбор сохраняется между местами. При уменьшении движения в системе запуск требует явного нажатия. Общий лес основан на полигонах wood OpenFreeMap; неизвестный тип показан условной смесью, около Мраткино/Абзаково сосны — художественная настройка. Позиции отдельных деревьев условны. Городские объекты и киоски представлены маркерами и карточками. «Карта оживает» включает также объёмную застройку по контурам OpenMapTiles; при отсутствии высоты используется условная высота 6 м. Наклон камеры доступен до 85°. Большой Крака: А и Б перенесены из кода владельца; отдельный трек БЮТ ведёт к прежней точке, путь к новой Б не построен. Штампы перенесены из исходного состава проекта и не показывают текущие остатки.</p>
  <p>Этнопарк: чум, ограда и 20 оленей — условная 3D-композиция по описанию владельца, а не точная схема участка.</p><h3>Источники</h3><p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, ODbL 1.0 · <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> / OpenMapTiles · <a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">Mapterhorn, источники рельефа</a>. Преувеличение высот 1. Автономный рельеф: Copernicus DEM GLO-30 (около 30 м), © DLR e.V. 2010–2014 / Airbus Defence and Space GmbH 2014–2018, предоставлен ЕС и ESA. MapLibre GL JS — BSD-3-Clause.</p>`;}
 preset(){const p=presetFor(this.id);return p.mobileZoom&&matchMedia('(max-width:760px)').matches?{...p,zoom:p.mobileZoom}:p;}
 async bootstrap(){
  const h=this.host;await this.choose(this.id,false,{silent:true,initial:true});
  if(this.initial.route)await this.openRoute(this.initial.route,{silent:true,focus:!this.initial.camera});
  this.cardOpen=this.initial.card!==false&&this.id!=='all';this.renderCard();
  if(this.initial.camera)h.map.jumpTo(this.initial.camera);
  if(this.legendBound!==h.map){this.legendBound=h.map;h.map.on('data',()=>{if(!this.statusTimer)this.statusTimer=setTimeout(()=>{this.statusTimer=null;this.updateLoadStatus();},180);});h.map.on('idle',()=>this.updateLoadStatus());h.map.on('idle',()=>this.refreshLegend());h.map.on('moveend',()=>{this.cameraButton();if(this.resizePending){this.resizePending=false;this.resizeLayout(true);}});}this.applySeason();this.sync();this.bootstrapped=true;this.resizeLayout(false,true);this.bridge.tryReady();
 }
 async choose(id,animate=true,meta={}){
  id=byId(id)?.id||id;if(id!=='rodeo')this.rodeoBagFocus=false;
  if(byId(id)?.kind==='stamp-point'&&(!this.filters.stamps||this.filters.passport&&!byId(id).sellsPassport))this.setFilters({view:'stamps'},meta);else if(byId(id)&&byId(id).kind!=='stamp-point'&&!this.filters.interesting)this.setFilters({view:'places'},meta);
  if(id!=='all'&&!byId(id))throw Error('UNKNOWN_PLACE');
  const h=this.host;this.id=id;this.routeId=null;this.importActive=false;h.selected=null;h.setAttribute('data-place',id);h.removeAttribute('data-route');h.$('.place-select').value=id;this.cardOpen=id!=='all'&&(meta.initial?this.initial.card!==false:true);this.renderPlace();this.renderCard();
  if(!h.map?.getLayer('snow'))return;
  h.highlight();if(this.ski.data){this.ski.selectedIds([]);this.ski.card?.replaceChildren();}this.hiking.selected=null;this.hiking.card.replaceChildren();
  if(meta.navigate!==false){h.map.stop();if(id==='all')this.overview(animate);else{const p=this.preset();h.mode2D=p.pitch<10;h.map.easeTo({center:p.center,zoom:p.zoom,pitch:p.pitch,bearing:p.bearing,padding:this.cameraPadding(),duration:animate?h.duration():0});this.cameraButton();}}
  if(!meta.silent)this.bridge.event('placeSelected',{placeId:id});
  if(id==='malinovaya'&&meta.navigate!==false){h.mode2D=false;h.flyToBounds(boundsFor(ROCK_SURFACES.features),35,62,animate,16.5);this.cameraButton();}
  if(id==='rodeo'&&meta.navigate!==false)this.focusRodeoPark(animate);
  if(id==='bolshoy-kraka'&&meta.navigate!==false)this.kraka.fit(false,animate);
  this.bridge.updateURL();
  try{if(id==='mratkino')await this.ensureResort();else if(id==='abzakovo')await this.ski.ensure();else if(hikingArea(id))await this.hiking.enter(id);else if(byId(id)?.geometryUrl)await this.catalog.ensure(id);}catch(e){this.dataError(e,'Данные места временно недоступны.');}
  this.sync();
 }
 overview(animate=true){const h=this.host;if(!h.map)return;this.showCard(false);this.longDistance.popup?.remove();const p=presetFor('all'),camera=h.map.cameraForBounds(p.bounds,{padding:45,bearing:p.bearing});h.map.stop();h.map.easeTo({...camera,pitch:p.pitch,bearing:p.bearing,duration:animate?h.duration():0});}
 renderPlace(){
  const h=this.host,p=byId(this.id),card=h.$('.region-panel');if(!card)return;const key=this.id+':'+this.routeId;if(this.placeCardKey===key)return;this.placeCardKey=key;
  card.replaceChildren();h.$('h1').textContent=p?.name||'Белорецкий район';h.$('.sidebar').scrollTop=0;h.$('.panel-body').scrollTop=0;
  h.cardTitle(card,placeKind(p?.kind),p?.name||'Ваш маршрут');
  if(!p)return;this.gallery.mount(card,p);
  if(p.description)h.text(card,p.description,p.historical?'historical-note':'place-description');
  if(p.access)h.text(card,p.access,'access-note');
  if(p.elevation)h.text(card,`Высота: ${p.elevation.toLocaleString('ru-RU')} м.`);
  const page=p.sourceUrl||(['malinovaya','malinovaya-3'].includes(this.id)?'https://visitbeloretsk.ru/malinovaya':this.id==='yalangas'?'https://www.visitbeloretsk.ru/yalangas':null);
  if(page&&!page.includes('openstreetmap.org')){const a=document.createElement('a');a.href=page;a.target='_blank';a.rel='noopener';a.textContent='О месте ↗';card.append(a);}
  renderPassportContent(card,p,this);
  if(p.id==='malinovaya')card.append(this.button('Рассмотреть скалы','Рассмотреть скалы',()=>{h.mode2D=false;h.flyToBounds([[58.3151,54.0029],[58.3165,54.0040]],35,64,true,17.5);this.cameraButton();}));
  if(p.id==='rodeo'){card.append(this.button('Рассмотреть фристайл-парк','Рассмотреть фристайл-парк',()=>this.focusRodeoPark()));card.append(this.button('Рассмотреть подушку','Рассмотреть подушку',()=>this.focusRodeoBag()));}
  if(p.id==='bolshoy-kraka')this.kraka.card(card);
  if(p.id==='kraka')card.append(this.button('Точки А и Б Большого Крака','Показать старт и видовую точку',()=>this.choose('bolshoy-kraka')));
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Координаты и источник';details.append(summary);h.text(details,`${p.coordinates[1]}, ${p.coordinates[0]}`,'place-coordinates');if(p.elevation)h.text(details,'Высота по данным OpenStreetMap.');if(page){const a=document.createElement('a');a.href=page;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Источник ↗';details.append(a);}
  if(p.sourceRecord)h.text(details,'Данные исходной карты проекта Visit Beloretsk.');card.append(details);
 }

 focusRodeoPark(animate=true){const h=this.host,b=boundsFor([{geometry:rodeoMask()}]),center=[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2],frame=b.map(p=>p.map((v,i)=>center[i]+(v-center[i])*.85));h.mode2D=false;h.flyToBounds(frame,-125,55,animate,18);this.cameraButton();}
 focusRodeoBag(){
  const h=this.host,plan=this.landscape.scene?.rodeo?.plan;
  if(!plan){this.rodeoBagFocus=true;this.focusRodeoPark();return;}
  this.rodeoBagFocus=false;const b=plan.bag,points=[plan.point(b.x-22,b.d-32),plan.point(b.x+22,b.d+32)].map(rodeoFrame.toLngLat);this.showCard(false);h.flyToBounds([[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]],20,55,true,18.5);
 }
 renderCard(){
  const h=this.host;if(!h.$('.sidebar'))return;h.$('.sidebar').hidden=!this.cardOpen;h.setAttribute('data-card-open',String(this.cardOpen));
  h.$('.region-panel').hidden=this.importActive;h.$('.resort-content').hidden=this.importActive||this.id!=='mratkino'||!h.resortLoaded;
  this.ski.panel.hidden=this.importActive||this.id!=='abzakovo';this.hiking.section.hidden=this.importActive||!hikingArea(this.id);this.routesPanel.hidden=!this.importActive;this.catalog.renderCard();
 }
 showCard(open){this.cardOpen=open;this.renderCard();if(!open)this.host.map?.setPadding({top:0,bottom:0,left:0,right:0});this.bridge.updateURL();}
 selectFeature(place,routeId,meta={}){
  const h=this.host;const placeChanged=this.id!==place;this.id=place;this.routeId=routeId;this.importActive=false;this.cardOpen=true;h.setAttribute('data-place',place);h.$('.place-select').value=place;
  if(routeId)h.setAttribute('data-route',routeId);else h.removeAttribute('data-route');
  if(place!=='mratkino'){h.selected=null;h.highlight();}if(place!=='abzakovo'&&this.ski.data)this.ski.selectedIds([]);
  this.renderPlace();this.renderCard();this.hiking.draw();this.bridge.updateURL();
  if(!meta.silent){if(placeChanged)this.bridge.event('placeSelected',{placeId:place});if(routeId)this.bridge.event('routeSelected',{placeId:place,routeId});}
 }
 async openRoute(id,meta={}){
  if(id.startsWith('long-distance/')){this.longDistance.open(id.split('/')[1],meta);return;}
  const lift=/^(mratkino|abzakovo)\/lift\/(way\/\d+)$/.exec(id);if(lift){if(lift[1]==='mratkino'){await this.ensureResort();const f=this.host.data.lifts.features.find(f=>f.properties.id===lift[2]);if(!f)throw Error('UNKNOWN_ROUTE');this.host.selectLift(f,!!meta.focus,meta);}else{await this.ski.ensure();const f=this.ski.data.lifts.features.find(f=>f.properties.id===lift[2]);if(!f)throw Error('UNKNOWN_ROUTE');this.ski.selectLift(f,meta);}return;}
  if(id.startsWith('abzakovo/trail/')){const n=id.split('/')[2];await this.ski.ensure();if(!this.ski.selectTrail(n,meta))throw Error('UNKNOWN_ROUTE');return;}
  if(id.startsWith('mratkino/trail/')){await this.ensureResort();const slug=id.split('/')[2],m=/^(south|north)-([1-4])$/.exec(slug),name=m?(m[1]==='south'?'Ю':'С')+m[2]:null;const f=this.host.data.trails.features.find(f=>f.geometry.type==='LineString'&&f.properties.name===name);if(!f)throw Error('UNKNOWN_ROUTE');this.host.selectTrail(f,false,meta);if(meta.focus)this.host.flyToFeatures([f],this.host.cameras[f.properties.slope]?.bearing||0);return;}
  if(this.catalog.isRoute(id)){await this.catalog.openRoute(id,meta);return;}
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
 cameraStarted(){
  this.cameraMoving=true;clearTimeout(this.settleTimer);this.settleTimer=null;
  this.landscape.syncAnimation();this.host.lifeScene?.setPaused(true);this.ski.scene?.setPaused(true);this.catalogLife.scene?.setPaused(true);this.updateLoadStatus();
 }
 cameraSettled(){
  clearTimeout(this.settleTimer);if(this.host.abort.aborted)return;
  this.settleTimer=setTimeout(()=>{this.settleTimer=null;if(this.host.map?.isMoving()||this.host.abort.aborted)return;this.cameraMoving=false;this.sync();},CAMERA_CONTROL.settleMs);
 }
 updateLoadStatus(){
  if(!this.loadStatus)return;const map=this.host.map,waiting=this.pending.size>0||this.landscape.pending.size>0||!!map&&!map.areTilesLoaded();
  this.loadStatus.hidden=!waiting||!!this.cameraMoving||!this.sceneVisible||this.host.getAttribute('data-map-state')!=='ready';
 }
 sync(){
  const h=this.host,map=h.map;if(!map?.getLayer('snow'))return;if(!this.sceneVisible){this.landscape.sync();this.syncScene();this.updateLoadStatus();return;}if(map.isMoving()||this.cameraMoving){if(!map.isMoving()&&!this.settleTimer)this.cameraSettled();return;}this.visible=visibleAreas(map,this.visible);h.setAttribute('data-visible-areas',this.visible.join(','));h.setAttribute('data-active-zones',this.visible.join(','));
  if(this.visible.includes('mratkino')&&!h.resortLoaded)this.request('mratkino',()=>this.ensureResort());
  if(this.visible.includes('abzakovo')&&!this.ski.data)this.request('abzakovo',()=>this.ski.ensure());
  const hiking=[...new Set(this.visible.map(hikingArea).filter(Boolean))];
  this.hiking.visible=new Set(this.filters.hiking?hiking:[]);for(const area of hiking)if(!this.hiking.datasets.has(area))this.request(area,()=>this.hiking.ensure(area));
  this.hiking.draw();h.resortActive=this.filters.ski&&this.visible.includes('mratkino')&&h.resortLoaded;this.ski.sync(this.filters.ski&&this.visible.includes('abzakovo')&&!!this.ski.data);
  for(const m of h.markers)m.regionalHidden=!h.resortActive;
  this.catalog.sync();const contextIds=[...new Set([...this.visible,...this.catalog.active])];
  const contexts=contextIds.filter(id=>id==='mratkino'?h.resortLoaded:id==='abzakovo'?!!this.ski.data:this.hiking.datasets.has(id)||!!this.catalog.datasets[id]?.features.some(f=>['ski','lift'].includes(f.properties.category)));contexts.sort((a,b)=>distanceKm(map.getCenter().toArray(),byId(a).coordinates)-distanceKm(map.getCenter().toArray(),byId(b).coordinates));
  const context=contexts.find(id=>!['mratkino','abzakovo'].includes(id)||distanceKm(map.getCenter().toArray(),byId(id).coordinates)<2.5)||null;if(this.context!==context){this.context=context;this.disposeScenes();}this.hiking.contextArea=['malinovaya','yalangas'].includes(context)?context:null;
  h.updateLayers();this.refreshLegend();
  this.kraka.sync();this.renderCard();this.landscape.sync();this.syncScene();this.layoutLabels();this.updateLoadStatus();
 }
 async toggleEffects(){this.effectsWanted=!this.effectsWanted;const map=this.host.map;
  if(this.effectsWanted&&map){const camera={};if(map.getPitch()<35){this.host.mode2D=false;camera.pitch=58;}if(map.getZoom()<13&&distanceKm(map.getCenter().toArray(),CITY.coordinates)<3)camera.zoom=14.2;if(Object.keys(camera).length)map.easeTo({...camera,duration:this.host.duration()});}
  this.motionExplicit=true;try{localStorage.setItem('vb3d-effects',this.effectsWanted?'1':'0');}catch{}this.bridge.updateURL();this.landscape.sync();await this.syncScene();}
 disposeScenes(){this.catalogLife.dispose();this.host.disposeLife();this.ski.disposeScene();this.hiking.disposeNature();}
 async syncScene(){
  const h=this.host;this.landscape.syncAnimation();
  if(h.map?.getLayer('region-buildings-3d')){const visibility=this.effectsWanted&&this.sceneVisible?'visible':'none';if(h.map.getLayoutProperty('region-buildings-3d','visibility')!==visibility)h.map.setLayoutProperty('region-buildings-3d','visibility',visibility);}
  if(!this.sceneVisible){this.disposeScenes();this.reflectLife();return;}
  if(this.cameraMoving||h.map?.isMoving()){h.lifeScene?.setPaused(true);this.ski.scene?.setPaused(true);this.catalogLife.scene?.setPaused(true);this.reflectLife();return;}
  if(this.scenePending||h.getAttribute('data-map-state')!=='ready')return;
  const context=h.map.getZoom()>=LINE_LOD.models&&this.filters.ski?this.context:null;
  if(!['mratkino','abzakovo'].includes(context)&&!this.catalog.datasets[context]){this.disposeScenes();this.reflectLife();return;}
  this.scenePending=true;
  try{if(context==='mratkino'&&!h.lifeScene)await h.toggleLife(true,true);else if(context==='abzakovo'&&!this.ski.scene)await this.ski.toggleLife(true);else if(!['mratkino','abzakovo'].includes(context))await this.catalogLife.ensure(context);}
  finally{this.scenePending=false;const scene=h.lifeScene||this.ski.scene||this.catalogLife.scene;if(scene)scene.setPaused(!this.effectsAllowed);this.reflectLife();if((this.context!==context||h.map.getZoom()<LINE_LOD.models)&&this.sceneVisible)this.syncScene();}
 }
 reflectLife(){const h=this.host,b=h.$('[data-action=life]');if(!b)return;b.disabled=false;const state=String(this.effectsWanted);if(b.dataset.motionState!==state){b.dataset.motionState=state;b.innerHTML=this.effectsWanted?'<svg width=14 height=14 viewBox="0 0 16 16" aria-hidden=true><path fill=currentColor d="M3 2h3v12H3zM10 2h3v12h-3z"/></svg><span>Карта оживает</span>':'<svg width=14 height=14 viewBox="0 0 16 16" aria-hidden=true><path fill=currentColor d="M4 2l10 6-10 6z"/></svg><span>Оживить карту</span>';}b.removeAttribute('role');b.removeAttribute('aria-checked');b.setAttribute('aria-pressed',String(this.effectsWanted));b.setAttribute('aria-label',this.effectsWanted?'Приостановить анимацию':'Оживить карту');b.dataset.loading=String(!!this.scenePending||this.landscape.active&&!this.landscape.scene);b.title=this.effectsWanted&&!this.effectsAllowed?'Движение временно приостановлено':'Условная анимация людей, подъёмников, оленей и леса';h.$('[data-action=life-pause]').hidden=true;h.$('.life-note').hidden=true;const scene=h.lifeScene||this.ski.scene||this.catalogLife.scene;h.setAttribute('data-scene-state',scene?(scene.paused?'paused':'playing'):this.landscape.scene?(this.landscape.scene.animating?'playing':'paused'):'off');}
 suspend(value){this.parentSuspended=value;if(value){clearTimeout(this.settleTimer);this.cameraMoving=false;}if(value)this.host.map?.stop();else{this.host.map?.resize();this.sync();}this.landscape.sync();this.syncScene();}
 resetMap(){
  const h=this.host,c=this.bridge.snapshot();this.initial={place:this.id,route:this.routeId,card:this.cardOpen,effects:this.effectsWanted,camera:c?{...c,center:[c.center.lng,c.center.lat]}:this.initial.camera};
  clearTimeout(this.settleTimer);this.cameraMoving=false;this.bootstrapped=false;this.legendKey=null;this.bridge.reset();this.landscape.disposeScene();this.disposeScenes();this.ski.dispose();this.ski.data=null;this.ski.promise=null;this.hiking.dispose();this.hiking.datasets.clear();this.hiking.boundMap=null;
  this.longDistance.reset();this.kraka.reset();this.markers.forEach(m=>m.marker.remove());this.markers=[];h.markers.forEach(m=>m.marker.remove());h.markers=[];h.resortLoaded=false;this.resortPromise=null;this.context=null;this.pending.clear();this.retryAfter.clear();
 }
 dataError(error,message='Часть карты временно недоступна.') {if(error?.name==='AbortError')return;const h=this.host,note=h.$('.error-note');if(!note.hidden&&note.dataset.message===message)return;note.dataset.message=message;note.hidden=false;note.textContent=message;const retry=this.button('Повторить','Повторить загрузку объектов',()=>{note.hidden=true;this.retryAfter.clear();this.landscape.retry.clear();this.landscape.stats.error=null;this.sync();const area=hikingArea(this.id);if(area)this.request(area,()=>this.hiking.enter(this.id));else if(this.id==='abzakovo')this.request(this.id,()=>this.ski.ensure());else if(this.id==='mratkino')this.request(this.id,()=>this.ensureResort());});note.append(retry);this.bridge.event('error',{code:'DATA_UNAVAILABLE',message,recoverable:true});}
 addLabels(){
  const h=this.host;this.markers.forEach(m=>m.marker.remove());this.markers=[];this.stampAnchorFilter=null;
  for(const p of PLACES.filter(p=>p.coordinates)){
   const stamp=p.kind==='stamp-point';
   const element=this.button(stamp?'':(p.kind==='peak'?'▲ ':'')+p.name,'Приблизить: '+p.name,()=>this.choose(p.id));
   element.className=stamp?'stamp-pin':'place-label';if(stamp)element.innerHTML='<svg width=22 height=22 viewBox="0 0 24 24" aria-hidden=true><path d="M9 4a3 3 0 016 0c0 2-2 3-2 5v2h4l3 5H4l3-5h4V9c0-2-2-3-2-5zM4 20h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';if(stamp&&p.sellsPassport){const badge=document.createElement('span');badge.className='passport-badge';badge.textContent='+';badge.title='Продаётся паспорт';element.append(badge);}element.dataset.placeId=p.id;element.title=p.name;
   const marker=new h.ml.Marker({element,anchor:stamp?'center':'bottom',occludedOpacity:.8}).setLngLat(p.coordinates).addTo(h.map);
   this.markers.push({p,element,marker});
  }
 }
 layoutLabels(){
  const h=this.host,map=h.map;if(!map)return;this.ski.layoutLabels();
  const enabled=h.$('[data-layer=labels]').checked,zoom=map.getZoom(),w=map.getContainer().clientWidth,hh=map.getContainer().clientHeight,occupied=[];
  const sorted=[...this.markers].sort((a,b)=>Number(b.p.id===this.id)-Number(a.p.id===this.id)||Number(b.p.kind==='stamp-point')-Number(a.p.kind==='stamp-point')||Number(!!b.p.major)-Number(!!a.p.major));
  const widths=sorted.map(({element,p})=>element.offsetWidth||(p.kind==='stamp-point'?44:110));
  for(const [index,{p,element,marker}] of sorted.entries()){
   const stamp=p.kind==='stamp-point',point=map.project(p.coordinates);const selected=String(p.id===this.id);if(element.getAttribute('aria-pressed')!==selected){element.classList.toggle('selected',p.id===this.id);element.setAttribute('aria-pressed',selected);}
   let offset=stamp&&zoom>=12.4?(p.id==='stampStation'?[-28,-16]:p.id==='kiosk3'?[28,16]:[0,0]):[0,0];
   // Keep nearby stamp buttons selectable in compact views; leader lines retain their true anchors.
   if(stamp&&!this.filters.interesting&&zoom>=12.4){
    const free=off=>{const r=[point.x+off[0]-22,point.y+off[1]-22,point.x+off[0]+22,point.y+off[1]+22];return r[0]>=8&&r[2]<=w-48&&r[1]>=55&&r[3]<=hh-65&&!occupied.some(a=>r[0]<a[2]&&r[2]>a[0]&&r[1]<a[3]&&r[3]>a[1]);};
    if(!free(offset)){const base=offset;let found=false;for(const d of [16,32,48,64]){for(const [x,y] of [[1,0],[-1,0],[0,-1],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]]){const candidate=[base[0]+x*d,base[1]+y*d];if(free(candidate)){offset=candidate;found=true;break;}}if(found)break;}}
   }
   if(stamp&&element.dataset.offset!==offset.join(',')){element.dataset.offset=offset.join(',');marker.setOffset(offset);element.style.setProperty('--leader-length',Math.hypot(...offset)+'px');element.style.setProperty('--leader-angle',Math.atan2(-offset[1],-offset[0])+'rad');}
   const width=widths[index],x=point.x+offset[0],y=point.y+offset[1],r=stamp?[x-22,y-22,x+22,y+22]:[x-width/2-5,y-30,x+width/2+5,y+5];
   const visible=!(p.id==='bolshoy-kraka'&&zoom>=10)&&enabled&&placeVisible(p,this.filters)&&!(h.resortActive&&p.id==='mratkino')&&!(this.ski.active&&p.id==='abzakovo')&&(zoom>=(stamp?12.4:10.6)||p.major||p.id===this.id)&&r[0]>=8&&r[2]<=w-48&&r[1]>=55&&r[3]<=hh-65&&!occupied.some(a=>r[0]<a[2]&&r[2]>a[0]&&r[1]<a[3]&&r[3]>a[1]);
   const visibility=visible?'visible':'hidden';if(element.style.visibility!==visibility){element.style.visibility=visibility;element.tabIndex=visible?0:-1;}if(visible)occupied.push(r);
  }
  if(map.getLayer('stamp-geographic-anchors')){
   const ids=enabled?PLACES.filter(p=>p.kind==='stamp-point'&&placeVisible(p,this.filters)).map(p=>p.id):[],key=ids.join(',');
   if(this.stampAnchorFilter!==key){this.stampAnchorFilter=key;map.setFilter('stamp-geographic-anchors',['in',['get','id'],['literal',ids]]);}
  }
 }
 layers(){const h=this.host;if(!h.map?.getLayer('snow'))return;this.longDistance.sync();this.kraka.sync();h.map.setLayoutProperty('region-paths','visibility',h.$('[data-layer=paths]').checked?'visible':'none');this.ski.layers();this.catalog.layers();const forest=h.$('[data-layer=forest]').checked;this.landscape.scene?.setForest(forest);if(this.forestWanted!==forest){this.forestWanted=forest;this.landscape.redraw();}this.landscape.syncAnimation();this.layoutLabels();h.layoutLabels();}
 async importRoute(file){
  if(!file)return;const h=this.host,card=h.$('.route-card');card.replaceChildren();
  try{if(file.size>5*1024*1024)throw Error('Максимальный размер — 5 МБ');const {parseGPX,normalizeRoutes,routeMetrics,routeEndpoints}=await import('./routes.js');const text=await file.text(),data=/\.gpx$/i.test(file.name)?parseGPX(text):normalizeRoutes(JSON.parse(text)),metrics=routeMetrics(data);this.routeData=data;this.importActive=true;
   h.map.getSource('touring-routes').setData({...data,features:data.features.filter(f=>f.geometry.type!=='Point')});h.map.getSource('route-stops').setData(routeEndpoints(data));h.cardTitle(card,'Ваш файл · не проверен',data.features.find(f=>f.geometry.type!=='Point').properties.name);h.text(card,`≈ ${metrics.lengthKm.toFixed(1)} км${metrics.gainM===null?'':` · набор ≈ ${metrics.gainM} м`}`);
   const show=this.button('Показать трек','Показать трек',()=>h.flyToFeatures(data.features,h.map.getBearing()));card.append(show);const remove=this.button('Убрать трек','Убрать трек',()=>{h.map.getSource('touring-routes').setData(EMPTY);h.map.getSource('route-stops').setData(EMPTY);this.routeData=null;this.importActive=false;this.showCard(false);card.replaceChildren();});card.append(remove);h.$('dialog').close();this.showCard(true);show.click();
  }catch(e){h.text(card,'Трек не открыт: '+e.message);this.importActive=true;this.showCard(true);}
 }
 dispose(){clearTimeout(this.settleTimer);clearTimeout(this.statusTimer);this.longDistance.reset();this.kraka.reset();this.gallery?.dispose();this.landscape.dispose();this.catalogLife.dispose();this.catalog.dispose();this.bridge.dispose();this.observer?.disconnect();this.hiking.dispose();this.ski.dispose();this.host.disposeLife();this.markers.forEach(m=>m.marker.remove());}
}
