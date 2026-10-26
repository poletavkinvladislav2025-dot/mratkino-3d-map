import {content} from './card-content.js';
import {sameInputs} from '../map-interaction.js';
import {EMPTY,boundsFor} from '../map-data.js';
export const hikingArea=id=>['malinovaya','malinovaya-2','malinovaya-3'].includes(id)?'malinovaya':id==='yalangas'?'yalangas':null;

export class HikingController{
 constructor(host){this.host=host;this.cache=new Map();this.datasets=new Map();this.visible=new Set();this.serial=0;this.markers=[];}
 get active(){return !!this.contextArea;}
 setup(){
  const h=this.host,section=document.createElement('section');section.className='hiking-panel';section.hidden=true;
  const heading=document.createElement('h3');heading.textContent='Пешие маршруты';section.append(heading);
  const options=document.createElement('div');options.className='hiking-options';options.setAttribute('role','group');options.setAttribute('aria-label','Вариант пешего маршрута');section.append(options);
  const card=document.createElement('div');card.className='hiking-card';card.setAttribute('aria-live','polite');section.append(card);
  h.$('.region-panel').after(section);this.section=section;this.options=options;this.card=card;
 }
 async ensure(area){
  const h=this.host;if(this.datasets.has(area))return this.datasets.get(area);
  if(!this.cache.has(area))this.cache.set(area,h.json(`region/hiking/${area}/routes.geojson`).catch(error=>{this.cache.delete(area);throw error;}));
  const data=await this.cache.get(area);if(h.abort.aborted)return;
  this.datasets.set(area,data);this.bindMap();this.draw();h.setAttribute('data-hiking-state','ready');return data;
 }
 async updateVisible(areas){
  this.visible=new Set(areas);this.draw();
  await Promise.all(areas.map(area=>this.ensure(area).catch(error=>this.host.region.dataError(error,'Маршруты временно недоступны.'))));
  this.draw();
 }
 async enter(place){
  const area=hikingArea(place);if(!area)return;const serial=this.selectionSerial=(this.selectionSerial||0)+1,data=await this.ensure(area);if(!data||serial!==this.selectionSerial||hikingArea(this.host.region.id)!==area)return;
  this.area=area;this.data=data;this.selected=null;this.route=null;this.card.replaceChildren();
  this.renderOptions();this.host.region.renderCard();
 }
 renderOptions(){
  this.options.replaceChildren();
  for(const f of this.data.features.filter(f=>f.geometry.type==='LineString')){
   const b=document.createElement('button');b.type='button';b.dataset.route=f.properties.id;b.textContent=f.properties.name;b.setAttribute('aria-pressed',String(this.selected===f.properties.id));b.addEventListener('click',()=>this.select(f.properties.id));this.options.append(b);
  }
 }
 async open(canonical,meta={}){
  const [area,id]=canonical.split('/');if(!['malinovaya','yalangas'].includes(area))return false;
  const serial=this.selectionSerial=(this.selectionSerial||0)+1,data=await this.ensure(area);if(!data||serial!==this.selectionSerial)return false;this.area=area;this.data=data;return this.select(id,true,false,meta);
 }
 select(id,animate=true,returning=false,meta={}){
  const h=this.host,route=this.data?.features.find(f=>f.geometry.type==='LineString'&&f.properties.id===id);if(!route)return false;
  this.selected=id;this.route=route;this.returning=returning;this.renderOptions();this.card.replaceChildren();
  h.cardTitle(this.card,'Пеший маршрут',(returning?'Обратно · ':'')+route.properties.name);
  h.text(this.card,`≈ ${(route.properties.distanceM/1000).toLocaleString('ru-RU',{maximumFractionDigits:1})} км${route.properties.kind==='out-and-back'?' туда и обратно':''}.`);
  h.text(this.card,content.hiking[this.area+'/'+id]||'Пеший маршрут по горным тропам Южного Урала.');const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Источник маршрута';details.append(summary);h.text(details,'Расчёт по пешеходной сети OpenStreetMap.');this.card.append(details);
  const show=document.createElement('button');show.type='button';show.textContent='Весь маршрут';show.addEventListener('click',()=>this.fit(route,true));this.card.append(show);
  if(route.properties.kind==='ascent'){
   const back=document.createElement('button');back.type='button';back.className='hiking-return';back.textContent=returning?'Показать подъём':'Показать путь обратно';back.setAttribute('aria-pressed',String(returning));back.addEventListener('click',()=>this.select(id,false,!returning));this.card.append(back);
  }
  const canonical=this.area+'/'+id;h.setAttribute('data-route',canonical);h.region.selectFeature(this.area,canonical,meta);this.draw();
  if(meta.focus)this.fit(route,animate);return true;
 }
 draw(){
  const map=this.host.map;if(!map?.getSource('hiking-routes'))return;
  const selected=this.host.region.routeId,inputs=[map,selected,this.area,this.selected,this.data,this.returning,...[...this.visible].sort().flatMap(area=>[area,this.datasets.get(area)])];if(sameInputs(this.drawInputs,inputs))return;this.drawInputs=inputs;
  const features=[...this.visible].flatMap(area=>(this.datasets.get(area)?.features||[]).filter(f=>f.geometry.type==='LineString').map(f=>{const canonicalId=area+'/'+f.properties.id;return {...f,properties:{...f.properties,area,canonicalId,selected:canonicalId===selected},geometry:canonicalId===selected&&this.returning?{...f.geometry,coordinates:[...f.geometry.coordinates].reverse()}:f.geometry};}));
  map.getSource('hiking-routes').setData({type:'FeatureCollection',features});this.clearStops(false);const automaticStops=[...this.visible].flatMap(area=>(this.datasets.get(area)?.features||[]).filter(f=>f.geometry.type==='Point'&&['start','finish','start-finish'].includes(f.properties.role)));if(!this.selected||selected!==this.area+'/'+this.selected||!this.visible.has(this.area)){map.getSource('hiking-stops').setData({type:'FeatureCollection',features:automaticStops});return;}
  const original=this.data.features.filter(f=>f.geometry.type==='Point'&&f.properties.routeId===this.selected);
  const stops=(this.returning?[...original].reverse():original).map((f,i)=>({...f,properties:{...f.properties,sequence:i+1,role:this.returning?(f.properties.role==='start'?'finish':f.properties.role==='finish'?'start':f.properties.role):f.properties.role}}));
  map.getSource('hiking-stops').setData({type:'FeatureCollection',features:[...automaticStops.filter(f=>f.properties.routeId!==this.selected),...stops]});
  for(const stop of stops){const b=document.createElement('button');b.type='button';b.className='hiking-stop';b.textContent=`${stop.properties.sequence} · ${stop.properties.role==='start-finish'?'Старт / финиш':stop.properties.name}`;b.addEventListener('click',()=>this.focus(stop.geometry.coordinates));this.markers.push(new this.host.ml.Marker({element:b,anchor:'bottom',occludedOpacity:.25}).setLngLat(stop.geometry.coordinates).addTo(map));}
 }
 bindMap(){const map=this.host.map;if(this.boundMap===map)return;this.boundMap=map;map.on('click','hiking-route-line',e=>{const id=e.features?.[0]?.properties.canonicalId;if(id)this.open(id);});}
 volume(){const h=this.host;h.mode2D=false;const b=h.$('[data-action=mode]');b.textContent='Вид сверху';b.title='Вид сверху';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Вид сверху');}
 fit(route,animate){const h=this.host,bounds=boundsFor([route]);if(!bounds)return;this.volume();h.map.stop();const camera=h.map.cameraForBounds(bounds,{padding:60,maxZoom:14,bearing:-25});h.map.easeTo({...camera,pitch:48,duration:animate?h.duration():0});}
 focus(center){this.volume();this.host.map.easeTo({center,zoom:15.8,pitch:58,bearing:-25,duration:this.host.duration()});}
 clearStops(clearSource=true){this.markers.forEach(m=>m.remove());this.markers=[];if(clearSource)this.host.map?.getSource('hiking-stops')?.setData(EMPTY);}
 clear(){this.drawInputs=null;this.clearStops();this.host.map?.getSource('hiking-routes')?.setData(EMPTY);}
 async toggleLife(force){
  const h=this.host;if(!this.active||h.lifeLoading||h.getAttribute('data-map-state')!=='ready')return;
  if(this.enabled&&force!==true){this.disposeNature();h.reflectLife();return;}if(this.enabled)return;
  const area=this.contextArea,serial=this.serial,map=h.map;h.lifeLoading=true;h.reflectLife();
  try{
   const [{NatureScene},index]=await Promise.all([import('./nature-scene.js'),h.json(`region/hiking/${area}/nature-index.json`)]);
   if(serial!==this.serial||map!==h.map||this.contextArea!==area||!h.region.effectsAllowed||h.abort.aborted)return;
   this.enabled=true;this.nature=new NatureScene(map,h.ml,index,{mobile:matchMedia('(max-width:760px)').matches,url:path=>h.url(`region/hiking/${area}/${path}`),onError:error=>h.region.dataError(error,'Часть деталей природы не загрузилась.'),onStats:stats=>h.setAttribute('data-nature-trees',String(stats.trees))});map.addLayer(this.nature);this.nature.setForest(h.$('[data-layer=forest]').checked);
  }catch(error){if(error.name!=='AbortError'){this.disposeNature();h.region.dataError(error,'Детализация временно недоступна.');}}
  finally{h.lifeLoading=false;if(h.map===map)h.reflectLife();}
 }
 reflectLife(){this.host.region.reflectLife();}
 disposeNature(){this.serial++;if(this.nature){if(this.host.map?.getLayer(this.nature.id))this.host.map.removeLayer(this.nature.id);if(!this.nature.disposed)this.nature.onRemove();}this.nature=null;this.enabled=false;}
 dispose(){this.serial++;this.disposeNature();this.clear();this.visible.clear();}
}
