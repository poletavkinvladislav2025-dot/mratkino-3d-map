import {PLACES,CITY,presetFor,byId,activeZones,distanceKm} from './presets.js';
import {EMPTY} from '../map-data.js';

/** Camera, local data and UI attached to the existing MapLibre instance. */
export class RegionController{
 constructor(host){this.host=host;this.id=new URLSearchParams(location.search).get('place')||host.getAttribute('place')||'mratkino';this.id=presetFor(this.id).id;this.zones=new Map();}
 setup(){
  const h=this.host;
  const navigation=document.createElement('div');navigation.className='region-navigation';
  const label=document.createElement('label');label.textContent='Куда отправимся?';
  const select=document.createElement('select');select.className='place-select';select.setAttribute('aria-label','Выбрать локацию');
  for(const p of [{id:'all',name:'Весь район'},CITY,...PLACES]){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.append(option);}select.value=this.id;label.append(select);navigation.append(label);
  const overview=document.createElement('button');overview.type='button';overview.textContent='↗ Весь район';overview.addEventListener('click',()=>this.choose('all'));navigation.append(overview);
  h.$('.toolbar').before(navigation);select.addEventListener('change',()=>this.choose(select.value));
  const body=h.$('.panel-body'),local=document.createElement('div');local.className='resort-content';
  const layers=h.$('.layers');for(const child of [...body.children])if(child!==layers)local.append(child);body.prepend(local);
  const panel=document.createElement('section');panel.className='region-panel';panel.setAttribute('aria-live','polite');body.prepend(panel);
  const routes=document.createElement('section');routes.className='routes-panel';
  const heading=document.createElement('h3');heading.textContent='Туристические маршруты';routes.append(heading);
  h.text(routes,'Проверенные треки пока не добавлены. Тропы OSM можно включить отдельным слоем; они не означают разрешённый маршрут.');
  const inputLabel=document.createElement('label');inputLabel.className='route-import';inputLabel.textContent='＋ Открыть свой GPX / GeoJSON';const input=document.createElement('input');input.type='file';input.accept='.gpx,.geojson,.json';input.setAttribute('aria-label','Открыть GPX или GeoJSON');inputLabel.append(input);routes.append(inputLabel);
  const card=document.createElement('div');card.className='route-card';card.setAttribute('aria-live','polite');routes.append(card);
  const link=document.createElement('a');link.href='https://greaturaltrail.ru/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Большая уральская тропа: источник ↗';routes.append(link);
  body.append(routes);input.addEventListener('change',()=>this.importRoute(input.files?.[0]));
  for(const [key,title,checked] of [['labels','Названия природных объектов',true],['paths','Тропы OSM · не проверены',false]]){
   const label=document.createElement('label'),span=document.createElement('span'),box=document.createElement('input');span.textContent=title;box.type='checkbox';box.dataset.layer=key;box.checked=checked;box.setAttribute('role','switch');box.addEventListener('change',()=>this.layers());label.append(span,box);layers.append(label);
  }
  h.$('.mobile-panel-toggle > span').textContent='Локации, маршруты и слои';
  h.$('.loading p').textContent='Загружаем рельеф Южного Урала…';
  h.$('.title-line p').textContent='Горы. Лес. Дорога к новым местам.';
  h.$('.map').setAttribute('aria-label','Трёхмерная карта Белорецкого района');
  h.$('.map-label > span').replaceChildren(document.createTextNode('VISIT BELORETSK / '));const b=document.createElement('b');b.className='view-label';h.$('.map-label > span').append(b);
  h.$('h1').textContent='Белорецкий район';this.renderPlace();
 }
 preset(){return presetFor(this.id);}
 async choose(id,animate=true){
  const h=this.host;this.id=presetFor(id).id;h.setAttribute('data-place',this.id);h.$('.place-select').value=this.id;this.renderPlace();
  if(!h.map?.getLayer('snow'))return;
  const preset=this.preset();for(const [key,value] of Object.entries(preset.layers)){const box=h.$(`[data-layer=${key}]`);if(box)box.checked=value;}this.layers();
  h.mode2D=preset.pitch<10;h.$('[data-action=mode]').setAttribute('aria-label',h.mode2D?'Вернуть объёмный вид':'Включить плоский вид');h.$('[data-action=mode]').textContent=h.mode2D?'3D':'2D';h.$('[data-action=mode]').setAttribute('aria-pressed',String(h.mode2D));
  h.map.stop();
  if(this.id==='mratkino'){
   try{await this.ensureResort();}catch(error){this.dataError(error);h.map.easeTo({...preset,duration:animate?h.duration():0});return;}if(this.id!=='mratkino'||!h.map)return;
   h.chooseView('south',animate);
  }else if(this.id==='all'){
   const camera=h.map.cameraForBounds(preset.bounds,{padding:{top:60,bottom:70,left:40,right:50},maxZoom:9.4,bearing:preset.bearing});h.map.easeTo({...camera,pitch:preset.pitch,bearing:preset.bearing,duration:animate?h.duration():0});
  }else h.map.easeTo({...preset,pitch:preset.pitch,duration:animate?h.duration():0});
  this.sync();
 }
 renderPlace(){
  const h=this.host,p=byId(this.id),card=h.$('.region-panel');if(!card)return;card.replaceChildren();
  h.cardTitle(card,this.id==='all'?'ОДНА КАРТА · 22 ЛОКАЦИИ':p?.kind==='city'?'ГОРОД И ОКРУЖАЮЩИЕ ГОРЫ':p?.kind==='resort'?'ГОРНОЛЫЖНЫЙ КОМПЛЕКС':'ЮЖНЫЙ УРАЛ',p?.name||'Исследуйте район');
  h.text(card,this.id==='all'?'Выберите гору на карте или в списке. Приближайте, вращайте и свободно перемещайтесь между локациями.':p?.kind==='city'?'Схематичные улицы на общем рельефе. Поверните карту или отдалите её, чтобы увидеть горы вокруг города.':p?.note||'Природная локация.');
  if(p?.elevation)h.text(card,`Высота вершины по OSM: ${p.elevation.toLocaleString('ru-RU')} м.`,'place-altitude');
  if(p?.access)h.text(card,p.access,'access-note');
  if(p?.osmId){const a=document.createElement('a');a.href='https://www.openstreetmap.org/'+p.osmId;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Объект в OpenStreetMap ↗';card.append(a);}
  h.$('.view-label').textContent=p?.name.toUpperCase()||'ВЕСЬ РАЙОН';
 }
 async ensureResort(){
  const h=this.host;if(h.resortLoaded)return;
  if(!this.resortPromise)this.resortPromise=(async()=>{
   const names=['trails','lifts','stations','forest','roads','facilities','contours'];const values=await Promise.all(names.map(n=>h.json('live/'+n+'.geojson')));
   if(h.abort.aborted)return;h.data={...h.data,...Object.fromEntries(names.map((n,i)=>[n,values[i]]))};h.resortLoaded=true;h.applyResortData();
   if(h.map?.isStyleLoaded()){
    for(const n of names)h.map.getSource(n)?.setData(h.data[n]);
    if(!h.map.getSource('forest-winter')){const [w,s,e,n]=h.data.manifest.bounds;h.map.addSource('forest-winter',{type:'image',url:h.url('live/forest-winter.png'),coordinates:[[w,n],[e,n],[e,s],[w,s]]});h.map.addLayer({id:'forest-soft',type:'raster',source:'forest-winter',paint:{'raster-opacity':1,'raster-fade-duration':0}},'road');}
    h.addMarkers();h.updateLayers();
   }
  })().catch(error=>{this.resortPromise=null;throw error;});
  return this.resortPromise;
 }
 dataError(error){const h=this.host;h.$('.error-note').hidden=false;h.$('.error-note').textContent='Данные Мраткино не загрузились. Общая карта доступна. '+error.message;}
 async sync(){
  const h=this.host,map=h.map;if(!map?.getLayer('snow'))return;
  const center=map.getCenter().toArray(),zones=activeZones(center,map.getZoom());
  h.setAttribute('data-active-zones',zones.map(p=>p.id).join(','));
  // Zone metadata is tiny and cached; terrain, vector paths and roads remain viewport-tiled.
  const keep=new Set(zones.map(p=>p.id));for(const id of this.zones.keys())if(!keep.has(id))this.zones.delete(id);
  for(const zone of zones)if(!this.zones.has(zone.id))this.zones.set(zone.id,{radiusKm:10,terrain:'viewport-tiles',paths:'OSM vector tiles, optional, unverified',routes:[]});
  const near=distanceKm(center,byId('mratkino').coordinates)<5&&map.getZoom()>=12.7;
  if(near&&!h.resortLoaded&&performance.now()>(this.retryAfter||0)){try{await this.ensureResort();if(h.map===map)this.sync();return;}catch(error){this.retryAfter=performance.now()+30000;this.dataError(error);}}
  h.resortActive=near&&h.resortLoaded;h.$('.resort-content').hidden=!h.resortActive;h.$('.views').hidden=!h.resortActive;
  h.$('.life-tools').hidden=!h.resortActive;h.$('.life-note').hidden=!h.resortActive||!h.lifeScene?.enabled;
  h.$('h1').textContent=h.resortActive?'Мраткино':this.id==='beloretsk'?'Белорецк':'Белорецкий район';
  if(!near&&h.lifeScene){h.disposeLife();h.reflectLife();}
  for(const name of ['lifts','contours','facilities']){const label=h.$(`[data-layer=${name}]`)?.closest('label');if(label)label.hidden=!h.resortActive;}
  for(const item of h.markers)item.regionalHidden=!h.resortActive;
  h.updateLayers();h.reflectLife();h.layoutLabels();this.layoutLabels();
  h.$('.data-summary').textContent=h.resortActive?'7 названных трасс OSM · 4 подъёмника · сведения требуют сверки':'22 локации · рельеф Mapterhorn · география OSM';
 }
 addLabels(){
  const h=this.host;this.markers=[];
  for(const p of PLACES){const element=document.createElement('button');element.type='button';element.className='place-label';element.textContent=(p.kind==='peak'?'▲ ':'')+p.name;element.setAttribute('aria-label','Приблизить: '+p.name);element.addEventListener('click',()=>this.choose(p.id));const marker=new h.ml.Marker({element,anchor:'bottom',occludedOpacity:.15}).setLngLat(p.coordinates).addTo(h.map);this.markers.push({p,element,marker});}
 }
 layoutLabels(){
  const h=this.host,map=h.map;if(!map||!this.markers)return;
  const enabled=h.$('[data-layer=labels]').checked,zoom=map.getZoom(),w=map.getContainer().clientWidth,hh=map.getContainer().clientHeight,occupied=[];
  const selected=this.id;
  for(const item of [...this.markers].sort((a,b)=>(b.p.id===selected?3:b.p.major?1:0)-(a.p.id===selected?3:a.p.major?1:0))){
   const {element,p}=item,point=map.project(p.coordinates),width=Math.max(110,element.offsetWidth),rect=[point.x-width/2-5,point.y-30,point.x+width/2+5,point.y+5];
   const visible=enabled&&!(h.resortActive&&p.id==='mratkino')&&(zoom>=10.6||p.major||p.id===selected)&&rect[0]>=8&&rect[2]<=w-48&&rect[1]>=60&&rect[3]<=hh-80&&!occupied.some(r=>rect[0]<r[2]&&rect[2]>r[0]&&rect[1]<r[3]&&rect[3]>r[1]);
   element.style.visibility=visible?'visible':'hidden';element.tabIndex=visible?0:-1;element.setAttribute('aria-hidden',String(!visible));if(visible)occupied.push(rect);
  }
 }
 layers(){const h=this.host;if(!h.map?.getLayer('snow'))return;if(h.map.getLayer('region-paths'))h.map.setLayoutProperty('region-paths','visibility',h.$('[data-layer=paths]').checked?'visible':'none');this.layoutLabels();}
 async importRoute(file){
  if(!file)return;const h=this.host,card=h.$('.route-card');card.replaceChildren();
  try{
   if(file.size>5*1024*1024)throw Error('Максимальный размер файла — 5 МБ');
   const {parseGPX,normalizeRoutes,routeMetrics,routeEndpoints}=await import('./routes.js');
   const text=await file.text(),data=/\.gpx$/i.test(file.name)?parseGPX(text):normalizeRoutes(JSON.parse(text));const metrics=routeMetrics(data);
   h.map.getSource('touring-routes').setData({...data,features:data.features.filter(f=>f.geometry.type!=='Point')});h.map.getSource('route-stops').setData(routeEndpoints(data));this.routeData=data;
   h.cardTitle(card,'ФАЙЛ ПОЛЬЗОВАТЕЛЯ · НЕ ПРОВЕРЕН',data.features.find(f=>f.geometry.type!=='Point').properties.name);
   h.text(card,`По геометрии: ≈ ${metrics.lengthKm.toLocaleString('ru-RU',{maximumFractionDigits:1})} км. ${metrics.gainM===null?'Высоты в треке отсутствуют.':`Набор по высотам файла: ≈ ${metrics.gainM} м, без фильтрации GPS-шума.`}`);
   h.text(card,`Остановок: ${metrics.stops}. Время: ${metrics.duration||'не указано'}. Доступность маршрута не подтверждена.`);
   const coords=p=>p.map(v=>v.toFixed(5)).join(', ');h.text(card,`Старт: ${coords(metrics.start.slice(0,2))}; финиш: ${coords(metrics.end.slice(0,2))} (долгота, широта).`);
   const show=document.createElement('button');show.type='button';show.textContent='Показать трек';show.addEventListener('click',()=>h.flyToFeatures(data.features,h.map.getBearing()));card.append(show);show.click();
   const remove=document.createElement('button');remove.type='button';remove.textContent='Убрать трек';remove.addEventListener('click',()=>{h.map.getSource('touring-routes').setData(EMPTY);h.map.getSource('route-stops').setData(EMPTY);card.replaceChildren();this.routeData=null;});card.append(remove);h.openPanel(true);
  }catch(error){h.text(card,'Трек не открыт: '+error.message);}
 }
}
