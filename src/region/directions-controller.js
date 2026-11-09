import {DIRECTION_ROUTES,directionRoute,directionPlace,directionFeatures,directionPadding,routeStatus} from './directions.js';
const EMPTY={type:'FeatureCollection',features:[]};
export class DirectionsController{
 constructor(region){this.region=region;this.host=region.host;this.markers=[];this.data=null;this.token=0;this.scope=null;}
 setup(){const h=this.host;if(this.scoped){this.region.filters.ski=false;this.region.filters.nordic=false;}this.section=document.createElement('section');this.section.className='directions-panel';h.$('.region-panel').before(this.section);}
 async ensure(){if(this.data)return this.data;if(!this.promise)this.promise=this.host.json('region/directions/routes-display.geojson').then(d=>this.data=d).catch(e=>{this.promise=null;throw e;});return this.promise;}
 bind(){const map=this.host.map;if(this.bound===map)return;this.bound=map;map.on('click','direction-route-line',e=>{const id=e.features?.[0]?.properties.routeId;if(id)this.open(id,{focus:true});});}
 async open(id,meta={}){
  const route=directionRoute(id);if(!route)return false;const token=++this.token,r=this.region,h=this.host;
  if(!r.filters.hiking)r.setFilters({hiking:true});if(this.scoped)this.scope=route.placeId;
  if(!meta.silent&&!meta.history){const u=new URL(location.href);u.searchParams.set('routeId',id);u.searchParams.set('placeId',route.placeId);for(const k of ['route','place','lat','lng','z','pitch','bearing'])u.searchParams.delete(k);history.pushState(null,'',u);}
  r.selectFeature(route.mapPlaceId,id,meta);this.render();this.drawPoints(route);h.setAttribute('data-direction-state',route.buildStatus);
  if(meta.focus)this.fit(route,false);this.bind();
  try{await this.ensure();}catch(e){if(token===this.token){h.setAttribute('data-direction-state','error');r.dataError(e,'Линия временно не загрузилась. Показаны известные точки маршрута.');}return true;}
  if(token!==this.token)return true;this.sync();return true;
 }
 get scoped(){return this.region.embedded&&!!(directionRoute(this.region.initial.route)||this.region.initial.explicitPlace&&directionPlace(this.region.initial.place));}
 fit(route=directionRoute(this.region.routeId),animate=true){
  if(!route?.bounds)return;const h=this.host,m=h.map,rect=h.$('.map-wrap'),s=h.$('.sidebar');m.stop();m.resize();m.setPadding({top:0,bottom:0,left:0,right:0});h.mode2D=false;
  const padding=directionPadding(rect.clientWidth,rect.clientHeight,this.region.cardOpen?s.offsetWidth:0,this.region.cardOpen?s.offsetHeight:0);
  m.fitBounds(route.bounds,{padding,maxZoom:route.hasGeometry?15:13.5,pitch:45,bearing:-25,duration:animate?h.duration():0,retainPadding:true});this.region.cameraButton();this.finishTerrainFit(route);
 }
 finishTerrainFit(route){
  this.cancelTerrainFit?.();this.host.setAttribute('data-route-fit','pending');const m=this.host.map,token=this.token;let stopped=false;
  const cleanup=()=>{stopped=true;m.off('idle',idle);m.off('movestart',manual);};
  const manual=e=>{if(e.originalEvent){cleanup();this.host.setAttribute('data-route-fit','cancelled');}};
  const idle=()=>{if(stopped)return;if(token!==this.token){cleanup();return;}if(m.getSource('dem')&&!m.isSourceLoaded('dem')||route.hasGeometry&&!this.data)return;cleanup();requestAnimationFrame(()=>{
   if(token!==this.token||m.isMoving()||this.host.abort.aborted)return;
   const rect=this.host.$('.map-wrap'),sidebar=this.host.$('.sidebar'),p=directionPadding(rect.clientWidth,rect.clientHeight,this.region.cardOpen?sidebar.offsetWidth:0,this.region.cardOpen?sidebar.offsetHeight:0),screen=[];
   const add=c=>{const q=m.project(c.slice(0,2));if(Number.isFinite(q.x)&&Number.isFinite(q.y))screen.push([q.x,q.y]);};
   for(const f of this.data?.features||[])if(f.properties.routeId===route.id)for(const c of f.geometry.coordinates)add(c);
   for(const q of route.points)add(q.coordinates);
   const canvas=m.getContainer().getBoundingClientRect();for(const marker of this.markers){const b=marker.getElement().getBoundingClientRect();screen.push([b.left-canvas.left,b.top-canvas.top],[b.right-canvas.left,b.bottom-canvas.top]);}
   if(!screen.length)return;const xs=screen.map(v=>v[0]),ys=screen.map(v=>v[1]),a=[Math.min(...xs),Math.min(...ys)],b=[Math.max(...xs),Math.max(...ys)],right=rect.clientWidth-p.right,bottom=rect.clientHeight-p.bottom;
   if(a[0]>=p.left&&a[1]>=p.top&&b[0]<=right&&b[1]<=bottom){this.host.setAttribute('data-route-fit','ready');return;}
   const scale=Math.max((b[0]-a[0])/Math.max(40,right-p.left),(b[1]-a[1])/Math.max(40,bottom-p.top),1),offset=[(a[0]+b[0]-p.left-right)/2,(a[1]+b[1]-p.top-bottom)/2];
   m.panBy(offset,{duration:0});if(scale>1)m.setZoom(Math.max(3,m.getZoom()-Math.log2(scale)-.08));this.host.setAttribute('data-route-fit','ready');
  });};
  this.cancelTerrainFit=cleanup;m.on('idle',idle);m.on('movestart',manual);
 }
 drawPoints(route){this.clearPoints();if(!route)return;const h=this.host;for(const p of route.points){const label=(p.role==='start-finish'?'Старт и финиш · ':p.role==='start'?'Старт · ':p.role==='goal'?'Цель · ':'')+p.name;const b=this.region.button(label,label,()=>{h.map.easeTo({center:p.coordinates,zoom:15,pitch:55,duration:h.duration()});});b.className='direction-point';b.dataset.pointId=p.id;b.dataset.role=p.role;b.title=p.name+(p.snapDistanceM?' · отклонение линии '+Math.round(p.snapDistanceM)+' м':'');const marker=new h.ml.Marker({element:b,anchor:'bottom',occludedOpacity:.5}).setLngLat(p.coordinates).addTo(h.map);this.markers.push(marker);}}
 clearPoints(){for(const m of this.markers)m.remove();this.markers=[];}
 render(){
  if(!this.section)return;const r=this.region,selected=directionRoute(r.routeId),group=directionPlace(r.id);this.section.replaceChildren();this.section.hidden=r.importActive||!group&&!selected;
  if(this.section.hidden)return;const h=this.host,heading=document.createElement('h3');heading.textContent='Варианты маршрута';this.section.append(heading);
  const picker=document.createElement('select');picker.className='direction-picker';picker.setAttribute('aria-label','Вариант пешего маршрута');const empty=document.createElement('option');empty.value='';empty.textContent='Выберите вариант';picker.append(empty);for(const route of DIRECTION_ROUTES.filter(x=>x.placeId===(selected?.placeId||group?.placeId))){const o=document.createElement('option');o.value=route.id;o.textContent=route.title+(route.buildStatus!=='ready'?' · '+(route.hasGeometry?'неполный':'только точки'):'');picker.append(o);}picker.value=selected?.id||'';picker.addEventListener('change',()=>{if(picker.value)this.open(picker.value,{focus:true});});this.section.append(picker);
  for(const route of DIRECTION_ROUTES.filter(x=>x.placeId===(selected?.placeId||group?.placeId))){const b=r.button(route.title,route.title,()=>this.open(route.id,{focus:true}));b.className='direction-choice';b.dataset.routeId=route.id;b.setAttribute('aria-pressed',String(route.id===selected?.id));if(route.buildStatus!=='ready')b.textContent+=' · '+(route.buildStatus==='partial'?'неполный':'только точки');this.section.append(b);}
  if(!selected)return;const card=document.createElement('div');card.className='direction-card';card.setAttribute('aria-live','polite');h.cardTitle(card,selected.days===2?'Пеший маршрут · 2 дня':'Пеший маршрут',selected.title);
  if(selected.displayDistanceM)h.text(card,`${selected.displayDistanceLabel}: ≈ ${(selected.displayDistanceM/1000).toLocaleString('ru-RU',{maximumFractionDigits:1})} км.`);
  if(selected.returnLabel)h.text(card,selected.returnLabel);
  if(routeStatus(selected))h.text(card,routeStatus(selected)+'. '+selected.statusReason,'warning');
  h.text(card,selected.description);const sourceNote=selected.geometrySourceLabel|| (selected.geometrySource==='source_gpx'?'Источник линии: опубликованный GPX.':selected.geometrySource?'Источник линии: расчёт по пешеходной сети OpenStreetMap.':'Известные точки показаны без соединяющей линии.');if(!selected.geometrySource)h.text(card,sourceNote);
  if(selected.bounds)card.append(r.button('Показать весь маршрут','Показать весь маршрут',()=>this.fit(selected)));
  if(selected.sourceUrl){const a=document.createElement('a');a.href=selected.sourceUrl;a.textContent='Описание маршрута ↗';a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
  // Provenance stays available but folded, so the card reads as a guide rather than a data sheet.
  const about=document.createElement('details'),aboutTitle=document.createElement('summary');aboutTitle.textContent='Источник данных';about.append(aboutTitle);if(selected.geometrySource)h.text(about,sourceNote);if(selected.downloadUrl){const a=document.createElement('a');a.href=selected.downloadUrl;a.textContent='Исходный GPX ↗';a.target='_blank';a.rel='noopener noreferrer';about.append(a);}if(selected.sourceUrl||selected.geometrySource)h.text(about,'Проверено: '+selected.checkedAt+' · редакция '+selected.revision,'direction-audit');if(about.childElementCount>1)card.append(about);this.section.append(card);
 }
 sync(){const h=this.host,m=h.map;if(!m?.getSource('direction-routes'))return;this.bind();const selected=directionRoute(this.region.routeId);if(this.scoped&&!this.scope)this.scope=selected?.placeId||directionPlace(this.region.id)?.placeId;const allowed=DIRECTION_ROUTES.filter(r=>r.hasGeometry&&(!this.scope||r.placeId===this.scope));
  const key=[this.data,this.scope,this.region.filters.hiking,this.region.routeId];if(!this.drawKey||key.some((v,i)=>v!==this.drawKey[i])){this.drawKey=key;m.getSource('direction-routes').setData(this.region.filters.hiking&&this.data?directionFeatures(this.data,allowed,this.region.routeId):EMPTY);}
  const pointKey=selected?.id+':'+this.region.filters.hiking;if(pointKey!==this.pointKey){this.pointKey=pointKey;this.drawPoints(this.region.filters.hiking?selected:null);}
  if(!this.data&&!this.promise)this.ensure().then(()=>this.sync()).catch(e=>this.region.dataError(e,'Пешие маршруты временно недоступны.'));
  if(this.scoped){for(const id of ['long-distance-gut-line','long-distance-gut-casing','long-distance-yt-line','long-distance-yt-casing','kraka-but-line','winter-catalog-line','winter-catalog-casing'])if(m.getLayer(id))m.setLayoutProperty(id,'visibility','none');}
 }
 reset(){this.cancelTerrainFit?.();++this.token;this.bound=null;this.drawKey=null;this.pointKey=null;this.clearPoints();}
}
