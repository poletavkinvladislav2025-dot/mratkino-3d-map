import {LINE_LOD} from '../landscape/config.js';
import {EMPTY,boundsFor} from '../map-data.js';
import {classification,decoratePistes,pisteId,catalog} from './piste-catalog.js';

/** Abzakovo uses the same map, terrain and animated resort renderer as Mratkino. */
export class SkiAreaController{
 constructor(host){this.host=host;this.serial=0;this.markers=[];this.active=false;this.loading=false;}
 setup(){
  const h=this.host,panel=document.createElement('section');panel.className='ski-area-panel';panel.hidden=true;h.$('.region-panel').after(panel);this.panel=panel;
 }
 async ensure(){
  const h=this.host;if(this.data)return this.data;
  h.setAttribute('data-abzakovo-state','loading');
  try{
   if(!this.promise)this.promise=Promise.all(['manifest.json','trails.geojson','lifts.geojson','stations.geojson','facilities.geojson','boundary.geojson','piste-areas.geojson'].map(n=>h.json('region/abzakovo/'+n))).then(([manifest,trails,lifts,stations,facilities,boundary,riderAreas])=>({manifest,trails:decoratePistes('abzakovo',trails),lifts,stations,facilities,boundary,riderAreas:decoratePistes('abzakovo',riderAreas)})).catch(error=>{this.promise=null;throw error;});
   const data=await this.promise;if(h.abort.aborted)return;this.data=data;
   for(const name of ['trails','lifts','stations','boundary'])h.map.getSource('abzakovo-'+name)?.setData(data[name]);
   h.map.getSource('abzakovo-piste-areas')?.setData(data.riderAreas);
   this.selectedIds([]);this.renderPanel();this.addLabels();this.bindMap();h.setAttribute('data-abzakovo-state','ready');h.region.renderCard();return data;
  }catch(error){if(error.name!=='AbortError'){h.setAttribute('data-abzakovo-state','error');this.panel.replaceChildren();h.text(this.panel,'Трассы Абзаково временно недоступны.');const b=document.createElement('button');b.type='button';b.textContent='Повторить';b.addEventListener('click',()=>this.ensure().then(()=>h.region.sync()).catch(()=>{}));this.panel.append(b);}throw error;}
 }
 sync(visible){this.active=visible;if(!visible)this.disposeScene();this.layers();this.layoutLabels();}
 renderPanel(){
  const h=this.host;this.panel.replaceChildren();
  h.text(this.panel,'Выберите трассу на схеме или в списке.','ski-area-intro');
  const list=document.createElement('div');list.className='abz-trails';list.setAttribute('role','group');list.setAttribute('aria-label','Трассы Абзаково');
  for(let n=1;n<=13;n++){
   const number=String(n),b=document.createElement('button');b.type='button';b.dataset.abzTrail=number;b.textContent='№'+number;
   b.style.setProperty('--trail-color',classification('abzakovo',{number}).color);
   if(number==='6'){b.className='missing';b.title='Нет геометрии и номера на опубликованной схеме';b.addEventListener('click',()=>{this.card.replaceChildren();h.cardTitle(this.card,'Нет подтверждённых данных','Трасса №6');h.text(this.card,'На доступной официальной схеме спуск №6 не обозначен. Геометрия не получена.');h.region.selectFeature('abzakovo',null);});}
   else b.addEventListener('click',()=>this.selectTrail(number,{focus:true}));list.append(b);
  }
  this.panel.append(list);
  const card=document.createElement('section');card.className='abz-card';card.setAttribute('aria-live','polite');this.panel.append(card);this.card=card;
  const details=document.createElement('details'),title=document.createElement('summary');title.textContent='Подъёмники';details.append(title);
  for(const f of this.data.lifts.features){const b=document.createElement('button');b.type='button';b.className='abz-lift';b.dataset.abzLift=f.properties.id;b.textContent=f.properties.name;b.addEventListener('click',()=>this.selectLift(f,{focus:true}));details.append(b);}this.panel.append(details);
 }
 selectedIds(ids){
  this.selected=ids;const map=this.host.map,match=['in',['get','id'],['literal',ids]],areaMatch=['in',['get','trailId'],['literal',ids]];
  map.setPaintProperty('abzakovo-trail-line','line-width',['interpolate',['linear'],['zoom'],11,['case',match,4,2.5],17,['case',match,7,4.5]]);
  map.setPaintProperty('abzakovo-trail-casing','line-width',['interpolate',['linear'],['zoom'],11,['case',match,7,5.5],17,['case',match,10,7.5]]);
  map.setPaintProperty('abzakovo-trail-shadow','line-width',['interpolate',['linear'],['zoom'],11,['case',match,9,7.5],17,['case',match,13,10]]);
  map.setPaintProperty('abzakovo-piste-fill','fill-opacity',ids.length?['case',areaMatch,.22,.10]:.12);
  map.setPaintProperty('abzakovo-lift-line','line-opacity',ids.length?['case',match,1,.85]:.95);
  for(const b of this.panel.querySelectorAll('[data-abz-trail]'))b.setAttribute('aria-pressed',String(this.data.trails.features.some(f=>ids.includes(f.properties.id)&&f.properties.number===b.dataset.abzTrail)));
 }
 selectTrail(number,meta={}){
  const h=this.host,features=this.data?.trails.features.filter(f=>f.properties.number===number);if(!features?.length)return false;
  this.selectedIds(features.map(f=>f.properties.id));this.card.replaceChildren();const c=classification('abzakovo',features[0].properties);
  h.cardTitle(this.card,'Трасса',number?'№'+number:'Без номера');h.text(this.card,c.label.split(' · ')[0],'difficulty-value');
  h.text(this.card,'Горнолыжный спуск курорта Абзаково.');
  this.button('Показать трассу',()=>this.fit(features));
  h.region.selectFeature('abzakovo',number?pisteId('abzakovo',features[0].properties):null,meta);if(meta.focus)this.fit(features);return true;
 }
 selectLift(f,meta={}){
  const h=this.host,p=f.properties;this.selectedIds([p.id]);this.card.replaceChildren();h.cardTitle(this.card,'Подъёмник',p.name);
  h.text(this.card,p.tags.aerialway==='chair_lift'?`Открытые кресла · ${p.seats} места.`:'Тарельчатый бугельный подъёмник.');

  this.button('Показать подъёмник',()=>this.fit([f]));h.region.selectFeature('abzakovo','abzakovo/lift/'+p.id,meta);if(meta.focus)this.fit([f]);
 }
 button(title,handler){const b=document.createElement('button');b.type='button';b.className='show-trail';b.textContent=title;b.addEventListener('click',handler);this.card.append(b);}
 sourceLinks(features){for(const f of features){const a=document.createElement('a');a.href=f.properties.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=f.properties.id+' ↗';this.card.append(a);}}
 volume(){const h=this.host;h.mode2D=false;const b=h.$('[data-action=mode]');b.textContent='Вид сверху';b.title='Вид сверху';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Вид сверху');}
 fit(features,animate=true){const bounds=boundsFor(features);if(!bounds)return;this.volume();this.host.flyToBounds(bounds,-70,57,animate,16.5);}
 inspect(f,zoom){this.volume();const coords=f.geometry.coordinates;this.host.map.easeTo({center:coords[Math.floor(coords.length/2)],zoom,pitch:58,bearing:-70,duration:this.host.duration()});}
 bindMap(){const map=this.host.map;if(this.boundMap===map)return;this.boundMap=map;map.on('click','abzakovo-trail-line',e=>{const f=this.data?.trails.features.find(f=>f.properties.id===e.features?.[0]?.properties.id);if(f)this.selectTrail(f.properties.number);});map.on('click','abzakovo-lift-line',e=>{const f=this.data?.lifts.features.find(f=>f.properties.id===e.features?.[0]?.properties.id);if(f)this.selectLift(f);});}
 addLabels(){
  const h=this.host;this.markers.forEach(m=>m.marker.remove());this.markers=[];
  const trails=this.data.manifest.trailNumbers.map(n=>this.data.trails.features.filter(f=>f.properties.number===n).sort((a,b)=>b.properties.mappedLengthM-a.properties.mappedLengthM)[0]);
  for(const f of [...trails,...this.data.lifts.features]){if(f.geometry.type!=='LineString')continue;const lift=!!f.properties.tags.aerialway,points=f.geometry.coordinates,b=document.createElement('button');b.type='button';b.className='abz-label'+(lift?' abz-lift-label':'');b.textContent=lift?(f.properties.tags.aerialway==='chair_lift'?'КД ':'Б ')+f.properties.number:'№'+f.properties.number;b.setAttribute('aria-label',f.properties.name);if(!lift)b.style.setProperty('--trail-color',classification('abzakovo',f.properties).color);b.addEventListener('click',e=>{e.stopPropagation();lift?this.selectLift(f):this.selectTrail(f.properties.number);});const marker=new h.ml.Marker({element:b,anchor:'bottom',occludedOpacity:.2}).setLngLat(points[Math.floor(points.length/2)]).addTo(h.map);this.markers.push({marker,button:b,feature:f});}
 }
 layoutLabels(){const h=this.host;if(!h.map)return;const occupied=[],width=h.map.getContainer().clientWidth,height=h.map.getContainer().clientHeight,enabled=this.active&&h.map.getZoom()>=LINE_LOD.labels&&h.$('[data-layer=labels]').checked;
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
  try{const [{ResortScene},{localFrame,decodeForestInstances},buffer]=await Promise.all([import('../resort-scene.js'),import('../resort-scene-data.js'),Promise.resolve(null)]);if(serial!==this.serial||map!==h.map||!this.active||(!h.region.sceneVisible||h.region.cameraMoving||map.isMoving()||map.getZoom()<13.4)||h.abort.aborted)return;
   const frame=localFrame(this.data.manifest.center),profile={id:'abzakovo-life',center:this.data.manifest.center,forest:false,forestMinZoom:11.5,saplings:false,seatsFromSource:true,riderAreasById:true,radiusM:2000,ridersPerSegment:this.data.manifest.ridersPerSegment,...frame};this.scene=new ResortScene(map,h.ml,this.data,{mobile:matchMedia('(max-width:760px)').matches,profile,forestInstances:null});map.addLayer(this.scene);this.layers();h.hideHint();
  }catch(error){this.disposeScene();if(error.name!=='AbortError')h.region.dataError(error,'Детализация временно недоступна. Трассы доступны.');}
  finally{this.loading=false;if(map===h.map)h.reflectLife();}
 }
 reflectLife(){if(this.host.region)return this.host.region.reflectLife();const h=this.host,b=h.$('[data-action=life]');b.disabled=this.loading||!this.active||h.getAttribute('data-map-state')!=='ready';b.textContent=this.loading?'Готовим сцену Абзаково…':this.scene?'✦ Живая сцена':'✦ Оживить карту';b.setAttribute('aria-pressed',String(!!this.scene));const pause=h.$('[data-action=life-pause]');pause.hidden=!this.scene;pause.textContent=this.scene?.paused?'Продолжить':'Пауза';pause.setAttribute('aria-pressed',String(!!this.scene?.paused));h.$('.life-note').hidden=!this.scene;h.$('.life-note').textContent='Иллюстрация · сосны 20–30 м · ширина катания по просекам приблизительная.';h.setAttribute('data-scene-state',this.scene?(this.scene.paused?'paused':'playing'):'off');}
 disposeScene(){if(!this.scene)return;if(this.host.map?.getLayer(this.scene.id))this.host.map.removeLayer(this.scene.id);if(!this.scene.disposed)this.scene.onRemove();this.scene=null;}
 clear(){this.markers.forEach(m=>m.marker.remove());this.markers=[];for(const n of ['trails','lifts','stations','boundary','piste-areas'])this.host.map?.getSource('abzakovo-'+n)?.setData(EMPTY);}
 dispose(){this.serial++;this.requested=false;this.active=false;this.disposeScene();this.clear();}
}
