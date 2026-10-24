import {content} from './card-content.js';
import registry from './long-distance-routes.json' with {type:'json'};
const routes=registry.map(r=>({...r,...content.trails[r.id]}));
export const LONG_DISTANCE_ROUTES=routes;
export const trailLayerId=route=>'long-distance-'+route.id+'-line';
/** Initial-style sources load in parallel with the terrain; no selection or animation needed. */
export function addLongDistanceLayers(style,url=path=>path){
 for(const route of routes){
  const source='long-distance-'+route.id;
  style.sources[source]={type:'geojson',data:url(route.asset),tolerance:.2,maxzoom:15,attribution:`<a href="${route.sourcePage}" target="_blank" rel="noopener">${route.name}</a>`};
  const layout={'line-cap':'round','line-join':'round',visibility:'visible'};
  style.layers.push({id:source+'-casing',type:'line',source,layout:{...layout},paint:{'line-color':'#345145','line-opacity':.45,'line-width':['interpolate',['linear'],['zoom'],3,2.2,8,2.8,15,3.3,20,3.8]}});
  style.layers.push({id:trailLayerId(route),type:'line',source,layout:{...layout},paint:{'line-color':route.color,'line-opacity':1,'line-width':['interpolate',['linear'],['zoom'],3,1.1,8,1.4,15,2,20,2.4]}});
 }
}
export class LongDistanceController{
 constructor(region){this.region=region;this.host=region.host;this.visible=Object.fromEntries(routes.map(r=>[r.id,true]));this.checkboxes=new Map();}
 setup(parent){
  const field=document.createElement('fieldset');field.className='long-distance-controls';const title=document.createElement('legend');title.textContent='Большие тропы';field.append(title);
  for(const route of routes){
   const row=document.createElement('div');row.className='long-route-row';const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span');input.type='checkbox';input.checked=true;input.dataset.longRoute=route.id;name.textContent=route.name;name.style.borderLeftColor=route.color;label.title=route.filename;label.append(input,name);
   input.addEventListener('change',()=>{this.visible[route.id]=input.checked;if(input.checked&&!this.region.filters.hiking)this.region.setFilters({hiking:true});this.sync();this.region.refreshLegend();});this.checkboxes.set(route.id,input);
   const fit=this.region.button('Целиком','Показать целиком: '+route.name,()=>this.fit(route.id));fit.dataset.fitLongRoute=route.id;
   const note=document.createElement('small');note.textContent=route.id==='gut'?`${route.segmentCount} участков и веток · ≈ ${Math.round(route.distanceKm).toLocaleString('ru-RU')} км`:`≈ ${Math.round(route.distanceKm)} км · по GPX`;
   row.append(label,fit,note);field.append(row);
  }
  parent.append(field);
 }
 sync(){
  const map=this.host.map;if(!map)return;this.bind();
  if(this.popup?.isOpen()&&this.popupRoutes.some(id=>!this.region.filters.hiking||!this.visible[id]))this.popup.remove();
  for(const route of routes){const show=this.region.filters.hiking&&this.visible[route.id];this.checkboxes.get(route.id).checked=show;for(const id of [trailLayerId(route),'long-distance-'+route.id+'-casing'])if(map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!==(show?'visible':'none'))map.setLayoutProperty(id,'visibility',show?'visible':'none');}
 }
 bind(){
  const map=this.host.map;if(this.boundMap===map)return;this.boundMap=map;
  map.on('click',event=>{
   const box=[[event.point.x-7,event.point.y-7],[event.point.x+7,event.point.y+7]];
   // Local pistes and lifts retain their own detailed cards at crossings.
   const local=['trail-line','lift-line','abzakovo-trail-line','abzakovo-lift-line','winter-catalog-line','hiking-route-line','kraka-but-line'].filter(id=>map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!=='none');
   if(local.length&&map.queryRenderedFeatures(box,{layers:local}).length){this.popup?.remove();return;}
   const layers=routes.filter(r=>this.region.filters.hiking&&this.visible[r.id]).map(trailLayerId).filter(id=>map.getLayer(id));
   if(!layers.length)return;
   const hits=new Set(map.queryRenderedFeatures(box,{layers}).map(f=>f.layer.id));
   const selected=routes.filter(r=>hits.has(trailLayerId(r)));if(!selected.length)return;
   this.popup?.remove();const content=document.createElement('div');content.className='long-route-popup';
   for(const route of selected){const section=document.createElement('section'),name=document.createElement('h3'),description=document.createElement('p'),link=document.createElement('a');name.textContent=route.name;name.style.borderLeftColor=route.color;description.textContent=route.description;link.href=route.sourcePage;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Сайт тропы ↗';section.append(name,description,link);content.append(section);}
   this.popupRoutes=selected.map(r=>r.id);this.popup=new this.host.ml.Popup({closeButton:true,closeOnClick:true,closeOnMove:true,maxWidth:'300px',className:'route-name-popup'}).setLngLat(event.lngLat).setDOMContent(content).addTo(map);
  });
 }
 reset(){this.popup?.remove();this.popup=null;this.boundMap=null;}
 fit(id){
  const route=routes.find(r=>r.id===id);if(!route||!this.host.map?.getLayer(trailLayerId(route)))return;
  this.visible[id]=true;if(!this.region.filters.hiking)this.region.setFilters({hiking:true});this.sync();this.region.showCard(false);this.region.layerPanel.hidden=true;this.region.layerButton.setAttribute('aria-expanded','false');
  this.host.mode2D=true;this.host.map.stop();this.host.map.fitBounds(route.bounds,{padding:matchMedia('(max-width:760px)').matches?{top:70,right:42,bottom:75,left:42}:85,maxZoom:12,pitch:0,bearing:0,duration:this.host.duration()});this.host.map.getCanvas().focus({preventScroll:true});
 }
}
