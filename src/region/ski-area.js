import {EMPTY,boundsFor} from '../map-data.js';
import {skiColor} from './ski-colors.js';

/** Abzakovo uses the same map, terrain and animated resort renderer as Mratkino. */
export class SkiAreaController{
 constructor(host){this.host=host;this.serial=0;this.markers=[];this.active=false;this.loading=false;}
 setup(){
  const h=this.host,panel=document.createElement('section');panel.className='ski-area-panel';panel.hidden=true;h.$('.region-panel').after(panel);this.panel=panel;
 }
 async enter(id,animate=true){
  const serial=++this.serial,h=this.host;this.requested=id==='abzakovo';this.active=false;this.panel.hidden=!this.requested;this.disposeScene();this.clear();
  if(!this.requested)return;
  this.panel.replaceChildren();h.text(this.panel,'Загружаем трассы и подъёмники Абзаково…');h.setAttribute('data-abzakovo-state','loading');
  try{
   if(!this.promise)this.promise=Promise.all(['manifest.json','trails.geojson','lifts.geojson','stations.geojson','facilities.geojson','boundary.geojson','piste-areas.geojson'].map(n=>h.json('region/abzakovo/'+n))).then(([manifest,trails,lifts,stations,facilities,boundary,riderAreas])=>({manifest,trails,lifts,stations,facilities,boundary,riderAreas})).catch(error=>{this.promise=null;throw error;});
   const data=await this.promise;if(serial!==this.serial||h.abort.aborted)return;this.data=data;this.active=true;
   for(const name of ['trails','lifts','stations','boundary'])h.map.getSource('abzakovo-'+name)?.setData(data[name]);
   h.map.getSource('abzakovo-piste-areas')?.setData(data.riderAreas);
   this.selectedIds([]);this.renderPanel();this.addLabels();this.bindMap();this.fit([...data.trails.features,...data.lifts.features],animate);h.setAttribute('data-abzakovo-state','ready');h.region.sync();
  }catch(error){if(serial===this.serial&&error.name!=='AbortError'){h.setAttribute('data-abzakovo-state','error');this.panel.replaceChildren();h.text(this.panel,'Данные Абзаково не загрузились. Общая карта доступна. '+error.message);const b=document.createElement('button');b.type='button';b.textContent='Повторить загрузку Абзаково';b.addEventListener('click',()=>this.enter('abzakovo'));this.panel.append(b);}}
 }
 sync(){
  const h=this.host;if(!this.requested||!this.data||h.getAttribute('data-abzakovo-state')!=='ready')return;
  // A narrow iframe fits the whole resort at a lower zoom. Keep detail while its
  // bounded area intersects the viewport, including close-ups away from the base.
  const b=h.map.getBounds(),[west,south,east,north]=this.data.manifest.bounds;
  const near=h.map.getZoom()>=11.5&&b.getWest()<=east&&b.getEast()>=west&&b.getSouth()<=north&&b.getNorth()>=south;
  this.active=near;this.panel.hidden=!near;if(!near)this.disposeScene();this.layers();this.layoutLabels();
 }
 renderPanel(){
  const h=this.host;this.panel.replaceChildren();h.cardTitle(this.panel,'ГОРНОЛЫЖНЫЙ КОМПЛЕКС · РАДИУС 2 КМ','Трассы и подъёмники');
  h.text(this.panel,'12 номеров трасс · 19 участков OSM · 8 подъёмников. Линии сверены с официальной схемой; точность положения зависит от исходника.','ski-area-intro');
  const list=document.createElement('div');list.className='abz-trails';list.setAttribute('role','group');list.setAttribute('aria-label','Трассы Абзаково');
  for(const number of this.data.manifest.trailNumbers){const b=document.createElement('button');b.type='button';b.dataset.abzTrail=number;b.textContent='№'+number;b.style.setProperty('--trail-color',skiColor(number));b.addEventListener('click',()=>this.selectTrail(number));list.append(b);}this.panel.append(list);
  const unknown=document.createElement('button');unknown.type='button';unknown.className='abz-unknown';unknown.textContent='Участки без номера · '+this.data.manifest.unnumberedSegments;unknown.addEventListener('click',()=>this.selectTrail(null));this.panel.append(unknown);
  const card=document.createElement('section');card.className='abz-card';card.setAttribute('aria-live','polite');h.text(card,'Выберите номер трассы или подъёмник. «Оживить карту» добавит сосны, катающихся и модели подъёмников.');this.panel.append(card);this.card=card;
  const title=document.createElement('h3');title.textContent='Подъёмники';this.panel.append(title);
  for(const f of this.data.lifts.features){const b=document.createElement('button');b.type='button';b.className='abz-lift';b.dataset.abzLift=f.properties.id;b.textContent=f.properties.name;b.addEventListener('click',()=>this.selectLift(f));this.panel.append(b);}
  const sources=document.createElement('p');sources.className='abz-source-note';sources.textContent='Цвет обозначает номер трассы, не сложность. Ширина рассчитана по лесным просекам и требует сверки. Люди и сосны — иллюстрация, не реальные посетители и не учёт деревьев.';this.panel.append(sources);
  for(const [title,url] of [['Официальная схема ↗',this.data.manifest.sources.officialScheme],['Источники и точность ↗',h.url('region/abzakovo/source-audit.json')]]){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=title;this.panel.append(a);}
 }
 selectedIds(ids){
  this.selected=ids;const map=this.host.map,match=['in',['get','id'],['literal',ids]],areaMatch=['in',['get','trailId'],['literal',ids]];
  map.setPaintProperty('abzakovo-trail-line','line-width',ids.length?['case',match,7,4.5]:4.5);
  map.setPaintProperty('abzakovo-trail-casing','line-width',ids.length?['case',match,10,7.5]:7.5);
  map.setPaintProperty('abzakovo-trail-shadow','line-width',ids.length?['case',match,13,10]:10);
  map.setPaintProperty('abzakovo-piste-fill','fill-opacity',ids.length?['case',areaMatch,.34,.16]:.22);
  map.setPaintProperty('abzakovo-lift-line','line-opacity',ids.length?['case',match,1,.85]:.95);
  for(const b of this.panel.querySelectorAll('[data-abz-trail]'))b.setAttribute('aria-pressed',String(this.data.trails.features.some(f=>ids.includes(f.properties.id)&&f.properties.number===b.dataset.abzTrail)));
 }
 selectTrail(number){
  const h=this.host,features=this.data.trails.features.filter(f=>f.properties.number===number);if(!features.length)return;this.selectedIds(features.map(f=>f.properties.id));this.card.replaceChildren();h.cardTitle(this.card,'ЛИНИЯ OSM · НОМЕР ПО СХЕМЕ',number?'Трасса №'+number:'Спуски без номера');
  const length=features.reduce((n,f)=>n+f.properties.mappedLengthM,0);h.text(this.card,`Нанесено участков: ${features.length}. По исходным линиям ≈ ${length.toLocaleString('ru-RU')} м, не паспортная длина. Разрывы не соединены.`);h.text(this.card,'Катающиеся распределены по расчётной ширине просеки и едут дугами. Границы не измерены курортом и требуют сверки. Цвет обозначает номер трассы.');
  this.button('Показать трассу',()=>this.fit(features));this.button('Рассмотреть катающихся',async()=>{await this.toggleLife(true);if(!this.scene)return;const f=features.reduce((a,b)=>a.properties.mappedLengthM>b.properties.mappedLengthM?a:b);this.inspect(f,18.8);});this.sourceLinks(features);h.openPanel(true);this.fit(features);
 }
 selectLift(f){
  const h=this.host,p=f.properties;this.selectedIds([p.id]);this.card.replaceChildren();h.cardTitle(this.card,'ГЕОМЕТРИЯ OSM · СВЕРКА СО СХЕМОЙ',p.name);h.text(this.card,p.tags.aerialway==='chair_lift'?`Открытые кресла на ${p.seats} места.`:'Одиночный тарельчатый бугельный подъёмник по типу OSM.');h.text(this.card,`По линии OSM ≈ ${p.mappedLengthM} м. Паспортная длина может отличаться.`);
  if(p.numberStatus.includes('unconfirmed')||p.numberStatus.includes('needs-check'))h.text(this.card,p.number==='1A/1B'?'Номера 1A и 1B известны по схеме, но порядок двух параллельных линий не подтверждён.':'Номер сопоставлен по положению на схеме; точная привязка и длина требуют проверки.');if(p.statusNote)h.text(this.card,p.statusNote,'owner-note');
  this.button('Показать подъёмник',()=>this.fit([f]));this.button('Рассмотреть подъёмник',async()=>{await this.toggleLife(true);if(this.scene)this.inspect(f,19);});this.sourceLinks([f]);h.openPanel(true);this.fit([f]);
 }
 button(title,handler){const b=document.createElement('button');b.type='button';b.className='show-trail';b.textContent=title;b.addEventListener('click',handler);this.card.append(b);}
 sourceLinks(features){for(const f of features){const a=document.createElement('a');a.href=f.properties.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=f.properties.id+' ↗';this.card.append(a);}}
 volume(){const h=this.host;h.mode2D=false;const b=h.$('[data-action=mode]');b.textContent='2D';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Включить плоский вид');}
 fit(features,animate=true){const h=this.host,bounds=boundsFor(features);if(!bounds)return;this.volume();const camera=h.map.cameraForBounds(bounds,{padding:{top:90,bottom:120,left:65,right:65},maxZoom:16.5,bearing:-70});h.map.stop();h.map.easeTo({...camera,pitch:57,duration:animate?h.duration():0});}
 inspect(f,zoom){this.volume();const coords=f.geometry.coordinates;this.host.map.easeTo({center:coords[Math.floor(coords.length/2)],zoom,pitch:58,bearing:-70,duration:this.host.duration()});}
 bindMap(){const map=this.host.map;if(this.boundMap===map)return;this.boundMap=map;map.on('click','abzakovo-trail-line',e=>{const f=this.data?.trails.features.find(f=>f.properties.id===e.features?.[0]?.properties.id);if(f)this.selectTrail(f.properties.number);});map.on('click','abzakovo-lift-line',e=>{const f=this.data?.lifts.features.find(f=>f.properties.id===e.features?.[0]?.properties.id);if(f)this.selectLift(f);});}
 addLabels(){
  const h=this.host;this.markers.forEach(m=>m.marker.remove());this.markers=[];
  const trails=this.data.manifest.trailNumbers.map(n=>this.data.trails.features.filter(f=>f.properties.number===n).sort((a,b)=>b.properties.mappedLengthM-a.properties.mappedLengthM)[0]);
  for(const f of [...trails,...this.data.lifts.features]){if(f.geometry.type!=='LineString')continue;const lift=!!f.properties.tags.aerialway,points=f.geometry.coordinates,b=document.createElement('button');b.type='button';b.className='abz-label'+(lift?' abz-lift-label':'');b.textContent=lift?(f.properties.tags.aerialway==='chair_lift'?'КД ':'Б ')+f.properties.number:'№'+f.properties.number;b.setAttribute('aria-label',f.properties.name);if(!lift)b.style.setProperty('--trail-color',skiColor(f.properties.number));b.addEventListener('click',e=>{e.stopPropagation();lift?this.selectLift(f):this.selectTrail(f.properties.number);});const marker=new h.ml.Marker({element:b,anchor:'bottom',occludedOpacity:.2}).setLngLat(points[Math.floor(points.length/2)]).addTo(h.map);this.markers.push({marker,button:b,feature:f});}
 }
 layoutLabels(){const h=this.host;if(!h.map)return;const occupied=[],width=h.map.getContainer().clientWidth,height=h.map.getContainer().clientHeight,enabled=this.active&&h.$('[data-layer=labels]').checked;
  for(const {marker,button,feature} of this.markers){const p=h.map.project(marker.getLngLat()),w=button.offsetWidth||40,r=[p.x-w/2,p.y-28,p.x+w/2,p.y+4],visible=enabled&&(!feature.properties.tags.aerialway||h.$('[data-layer=lifts]').checked)&&r[0]>8&&r[2]<width-45&&r[1]>60&&r[3]<height-85&&!occupied.some(a=>r[0]<a[2]+5&&r[2]>a[0]-5&&r[1]<a[3]+5&&r[3]>a[1]-5);button.style.visibility=visible?'visible':'hidden';button.tabIndex=visible?0:-1;if(visible)occupied.push(r);}
 }
 layers(){const h=this.host;if(!h.map)return;for(const id of ['abzakovo-piste-fill','abzakovo-trail-shadow','abzakovo-trail-casing','abzakovo-trail-line','abzakovo-boundary'])if(h.map.getLayer(id))h.map.setLayoutProperty(id,'visibility',this.active?'visible':'none');for(const id of ['abzakovo-lift-line','abzakovo-stations'])if(h.map.getLayer(id))h.map.setLayoutProperty(id,'visibility',this.active&&h.$('[data-layer=lifts]').checked?'visible':'none');this.scene?.setLayers({forest:h.$('[data-layer=forest]').checked,lifts:h.$('[data-layer=lifts]').checked});}
 async forestBuffer(){
  if(!this.forestPromise)this.forestPromise=fetch(this.host.url('region/abzakovo/'+this.data.manifest.forestInstances),{signal:this.host.abort}).then(r=>{if(!r.ok)throw Error('Сосновый лес: HTTP '+r.status);return r.arrayBuffer();}).catch(error=>{this.forestPromise=null;throw error;});
  return this.forestPromise;
 }
 async toggleLife(force){
  const h=this.host;if(!this.active||this.loading||h.getAttribute('data-map-state')!=='ready')return;if(this.scene){if(force!==true)this.disposeScene();h.reflectLife();return;}
  const serial=this.serial,map=h.map;this.loading=true;h.reflectLife();
  try{const [{ResortScene},{localFrame,decodeForestInstances},buffer]=await Promise.all([import('../resort-scene.js'),import('../resort-scene-data.js'),this.forestBuffer()]);if(serial!==this.serial||map!==h.map||!this.active||h.abort.aborted)return;
   const frame=localFrame(this.data.manifest.center),profile={id:'abzakovo-life',center:this.data.manifest.center,forest:true,forestMinZoom:11.5,saplings:false,seatsFromSource:true,riderAreasById:true,radiusM:2000,ridersPerSegment:this.data.manifest.ridersPerSegment,...frame};this.scene=new ResortScene(map,h.ml,this.data,{mobile:matchMedia('(max-width:760px)').matches,profile,forestInstances:decodeForestInstances(buffer,this.data.manifest.center)});map.addLayer(this.scene);this.layers();h.hideHint();
  }catch(error){this.disposeScene();if(error.name!=='AbortError'){h.$('.error-note').hidden=false;h.$('.error-note').textContent='Сцена Абзаково не загрузилась. Трассы доступны. '+error.message;}}
  finally{this.loading=false;if(map===h.map)h.reflectLife();}
 }
 reflectLife(){const h=this.host,b=h.$('[data-action=life]');b.disabled=this.loading||!this.active||h.getAttribute('data-map-state')!=='ready';b.textContent=this.loading?'Готовим сцену Абзаково…':this.scene?'✦ Живая сцена':'✦ Оживить карту';b.setAttribute('aria-pressed',String(!!this.scene));const pause=h.$('[data-action=life-pause]');pause.hidden=!this.scene;pause.textContent=this.scene?.paused?'Продолжить':'Пауза';pause.setAttribute('aria-pressed',String(!!this.scene?.paused));h.$('.life-note').hidden=!this.scene;h.$('.life-note').textContent='Иллюстрация · сосны 20–30 м · ширина катания по просекам приблизительная.';h.setAttribute('data-scene-state',this.scene?(this.scene.paused?'paused':'playing'):'off');}
 disposeScene(){if(!this.scene)return;if(this.host.map?.getLayer(this.scene.id))this.host.map.removeLayer(this.scene.id);if(!this.scene.disposed)this.scene.onRemove();this.scene=null;}
 clear(){this.markers.forEach(m=>m.marker.remove());this.markers=[];for(const n of ['trails','lifts','stations','boundary','piste-areas'])this.host.map?.getSource('abzakovo-'+n)?.setData(EMPTY);}
 dispose(){this.serial++;this.requested=false;this.active=false;this.disposeScene();this.clear();}
}
