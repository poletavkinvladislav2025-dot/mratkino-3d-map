import {EMPTY,boundsFor} from '../map-data.js';
export const hikingArea=id=>id==='malinovaya'||id==='malinovaya-3'?'malinovaya':id==='yalangas'?'yalangas':null;

/** Built-in OSM walking routes, independently selectable from user-imported tracks. */
export class HikingController{
 constructor(host){this.host=host;this.cache=new Map();this.serial=0;this.markers=[];}
 get active(){return !!this.area;}
 setup(){
  const h=this.host,section=document.createElement('section');section.className='hiking-panel';section.hidden=true;
  const heading=document.createElement('h3');heading.textContent='Пешие маршруты';section.append(heading);
  const options=document.createElement('div');options.className='hiking-options';options.setAttribute('role','group');options.setAttribute('aria-label','Вариант пешего маршрута');section.append(options);
  const card=document.createElement('div');card.className='hiking-card';card.setAttribute('aria-live','polite');section.append(card);
  h.$('.region-panel').after(section);this.section=section;this.options=options;this.card=card;
 }
 async enter(place,animate=true){
  const h=this.host,area=hikingArea(place),serial=++this.serial;
  if(area!==this.area){this.disposeNature();this.area=area;this.data=null;this.selected=null;this.clear();}
  this.section.hidden=!area;if(!area)return false;
  h.setAttribute('data-hiking-state','loading');this.card.replaceChildren();h.text(this.card,'Загружаем маршруты…');
  try{
   if(!this.cache.has(area))this.cache.set(area,h.json(`region/hiking/${area}/routes.geojson`).catch(error=>{this.cache.delete(area);throw error;}));
   const data=await this.cache.get(area);if(serial!==this.serial||h.abort.aborted)return true;
   this.data=data;this.options.replaceChildren();
   for(const f of data.features.filter(f=>f.geometry.type==='LineString')){
    const button=document.createElement('button');button.type='button';button.dataset.route=f.properties.id;button.textContent=f.properties.name;button.addEventListener('click',()=>this.select(f.properties.id));this.options.append(button);
   }
   this.select(place==='malinovaya-3'?'third':data.features.find(f=>f.geometry.type==='LineString').properties.id,animate);
   h.setAttribute('data-hiking-state','ready');h.reflectLife();
  }catch(error){if(serial===this.serial&&error.name!=='AbortError'){h.setAttribute('data-hiking-state','error');this.card.replaceChildren();h.text(this.card,'Маршруты не загрузились. '+error.message);const retry=document.createElement('button');retry.type='button';retry.textContent='Повторить загрузку маршрутов';retry.addEventListener('click',()=>this.enter(place,animate));this.card.append(retry);}}
  return true;
 }
 select(id,animate=true,returning=false){
  const h=this.host,route=this.data?.features.find(f=>f.geometry.type==='LineString'&&f.properties.id===id);if(!route)return;
  this.selected=id;this.route=route;
  for(const button of this.options.children)button.setAttribute('aria-pressed',String(button.dataset.route===id));
  const originalStops=this.data.features.filter(f=>f.geometry.type==='Point'&&f.properties.routeId===id);
  const stops=(returning?[...originalStops].reverse():originalStops).map((f,i)=>({...f,properties:{...f.properties,sequence:i+1,role:returning?(f.properties.role==='start'?'finish':f.properties.role==='finish'?'start':f.properties.role):f.properties.role}}));
  const displayed=returning?{...route,geometry:{...route.geometry,coordinates:[...route.geometry.coordinates].reverse()}}:route;
  h.map.getSource('hiking-routes')?.setData({type:'FeatureCollection',features:[displayed]});h.map.getSource('hiking-stops')?.setData({type:'FeatureCollection',features:stops});
  h.setAttribute('data-route',`${this.area}/${id}`);this.markers.forEach(m=>m.remove());this.markers=[];
  for(const stop of stops){
   const button=document.createElement('button');button.type='button';button.className='hiking-stop';button.textContent=`${stop.properties.sequence} · ${stop.properties.role==='start-finish'?'Старт / финиш':stop.properties.name}`;button.setAttribute('aria-label','Приблизить: '+stop.properties.name);
   button.addEventListener('click',()=>this.focus(stop.geometry.coordinates));
   const marker=new h.ml.Marker({element:button,anchor:'bottom',occludedOpacity:.25}).setLngLat(stop.geometry.coordinates).addTo(h.map);this.markers.push(marker);
  }
  this.card.replaceChildren();h.cardTitle(this.card,'ПО ТРОПАМ OSM · ТРЕБУЕТ ПРОВЕРКИ',(returning?'Обратно · ':'')+route.properties.name);
  h.text(this.card,`≈ ${(route.properties.distanceM/1000).toLocaleString('ru-RU',{maximumFractionDigits:1})} км${route.properties.kind==='out-and-back'?' туда и обратно':''}. ${returning?'Возвращение от вершины к старту по той же тропе.':route.properties.kind==='through'?'Финиш — в Отнурке.':route.properties.kind==='ascent'?'Указана длина подъёма; возвращение — по той же тропе.':'Возвращение точно по пути подъёма.'}`);
  h.text(this.card,'Линия рассчитана по связной сети дорог и троп OSM. Проходимость, броды и последние метры к вершинам требуют проверки.');
  const sequence=document.createElement('ol');sequence.className='hiking-stop-list';
  for(const stop of stops){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=stop.properties.role==='start-finish'?'Белорецк · старт и финиш':stop.properties.name;b.addEventListener('click',()=>this.focus(stop.geometry.coordinates));li.append(b);sequence.append(li);}this.card.append(sequence);
  const show=document.createElement('button');show.type='button';show.textContent='Весь маршрут';show.addEventListener('click',()=>this.fit(route,true));this.card.append(show);
  if(route.properties.kind==='ascent'){
   const back=document.createElement('button');back.type='button';back.className='hiking-return';back.textContent=returning?'Показать подъём':'Показать путь обратно';back.setAttribute('aria-pressed',String(returning));back.addEventListener('click',()=>this.select(id,false,!returning));this.card.append(back);
  }
  const source=document.createElement('a');source.href=h.url(`region/hiking/${this.area}/route-audit.json`);source.target='_blank';source.rel='noopener noreferrer';source.textContent='Источники и привязка точек ↗';this.card.append(source);
  this.fit(route,animate);
 }
 volume(){const h=this.host;h.mode2D=false;const button=h.$('[data-action=mode]');button.textContent='2D';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Включить плоский вид');}
 fit(route,animate){const h=this.host,bounds=boundsFor([route]);if(!bounds)return;this.volume();h.map.stop();const camera=h.map.cameraForBounds(bounds,{padding:{top:90,bottom:120,left:55,right:65},maxZoom:14,bearing:-25});h.map.easeTo({...camera,pitch:48,duration:animate?h.duration():0});}
 focus(center){this.volume();this.host.map.easeTo({center,zoom:15.8,pitch:58,bearing:-25,duration:this.host.duration()});}
 clear(){const h=this.host;this.markers.forEach(m=>m.remove());this.markers=[];this.options?.replaceChildren();for(const id of ['hiking-routes','hiking-stops'])h.map?.getSource(id)?.setData(EMPTY);h.removeAttribute('data-route');}
 async toggleLife(force){
  const h=this.host;if(!this.active||h.lifeLoading||h.getAttribute('data-map-state')!=='ready')return;
  if(this.enabled&&force!==true){this.disposeNature();this.reflectLife();return;}
  if(this.enabled)return;
  const area=this.area,serial=this.serial,map=h.map;h.lifeLoading=true;h.reflectLife();
  try{
   const [{NatureScene},index]=await Promise.all([import('./nature-scene.js'),h.json(`region/hiking/${area}/nature-index.json`)]);
   if(serial!==this.serial||map!==h.map||h.abort.aborted)return;
   this.enabled=true;this.nature=new NatureScene(map,h.ml,index,{mobile:matchMedia('(max-width:760px)').matches,url:path=>h.url(`region/hiking/${area}/${path}`),onError:error=>{h.$('.error-note').hidden=false;h.$('.error-note').textContent='Часть природной сцены не загрузилась. '+error.message;},onStats:stats=>h.setAttribute('data-nature-trees',String(stats.trees))});map.addLayer(this.nature);this.nature.setForest(h.$('[data-layer=forest]').checked);
   h.$('.hint').hidden=true;
   if(map.getZoom()<14.2){const stop=this.data.features.find(f=>f.properties.routeId===this.selected&&f.geometry.type==='Point'&&f.properties.osmId);if(stop)this.focus(stop.geometry.coordinates);}
  }catch(error){if(error.name!=='AbortError'){this.disposeNature();h.$('.error-note').hidden=false;h.$('.error-note').textContent='Детализация не загрузилась. Маршруты доступны. '+error.message;}}
  finally{h.lifeLoading=false;if(h.map===map)h.reflectLife();}
 }
 reflectLife(){
  const h=this.host,b=h.$('[data-action=life]');b.disabled=h.lifeLoading||!this.data||h.getAttribute('data-map-state')!=='ready';b.textContent=h.lifeLoading?'Готовим природную сцену…':this.enabled?'✦ Детали природы':'✦ Оживить карту';b.setAttribute('aria-pressed',String(!!this.enabled));h.$('[data-action=life-pause]').hidden=true;
  h.$('.life-note').hidden=!this.enabled;h.$('.life-note').textContent='Лес и скальные участки по OSM. Приблизьте карту для деталей.';h.setAttribute('data-scene-state',this.enabled?'nature':'off');
 }
 disposeNature(){if(this.nature){if(this.host.map?.getLayer(this.nature.id))this.host.map.removeLayer(this.nature.id);if(!this.nature.disposed)this.nature.onRemove();}this.nature=null;this.enabled=false;}
 dispose(){this.serial++;this.disposeNature();this.clear();}
}
