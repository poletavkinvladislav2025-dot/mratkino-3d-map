import {routeName,routeKind,routeDescription} from './card-content.js';
import {sameInputs} from '../map-interaction.js';
import {PLACES} from './presets.js';
import {classification} from './piste-catalog.js';
import {intersects} from './viewport.js';
import {LINE_LOD} from '../landscape/config.js';
export class CatalogController{
 constructor(region){this.region=region;this.host=region.host;this.datasets={};this.pending=new Map();this.active=[];}
 setup(){const p=document.createElement('section');p.className='catalog-panel';p.hidden=true;this.host.$('.region-panel').after(p);this.panel=p;}
 async ensure(id){if(this.datasets[id])return this.datasets[id];if(!this.pending.has(id)){const p=PLACES.find(p=>p.id===id);if(!p?.geometryUrl)return;this.pending.set(id,this.host.json(p.geometryUrl).then(data=>{this.datasets[id]={...data,features:data.features.map(f=>({...f,properties:{...f.properties,displayColor:f.properties.category==='lift'?'#806b9e':f.properties.category==='nordic'?'#9c5f26':['tubing','training'].includes(f.properties.category)?'#8b7298':classification(id,f.properties).color}}))};this.sync();return this.datasets[id];}).finally(()=>this.pending.delete(id)));}return this.pending.get(id);}
 sync(){const h=this.host,m=h.map;if(!m?.getSource('winter-catalog'))return;this.bind();const b=m.getBounds(),z=m.getZoom(),pad=.015,box={getWest:()=>b.getWest()-pad,getEast:()=>b.getEast()+pad,getSouth:()=>b.getSouth()-pad,getNorth:()=>b.getNorth()+pad};this.active=PLACES.filter(p=>p.geometryUrl&&p.bounds&&z>=LINE_LOD.exit&&intersects(box,p.bounds)).map(p=>p.id);
  for(const id of this.active)if(!this.datasets[id]&&!this.pending.has(id))this.region.request(id,()=>this.ensure(id));
  this.layers();this.renderCard();
 }
 layers(){const h=this.host,m=h.map;if(!m?.getSource('winter-catalog'))return;const inputs=[m,this.region.filters.nordic,this.region.filters.ski,h.$('[data-layer=lifts]').checked,this.region.routeId,...this.active.flatMap(id=>[id,this.datasets[id]])];if(sameInputs(this.layerInputs,inputs))return;this.layerInputs=inputs;const selected=Object.values(this.datasets).flatMap(d=>d.features).find(x=>x.properties.routeId===this.region.routeId);const features=this.active.flatMap(id=>this.datasets[id]?.features||[]).filter(f=>f.properties.category==='nordic'?this.region.filters.nordic:this.region.filters.ski).filter(f=>f.properties.category!=='lift'||h.$('[data-layer=lifts]').checked).map(f=>({...f,properties:{...f.properties,selected:f.properties.routeId===this.region.routeId||this.samePiste(f,selected)}}));m.getSource('winter-catalog').setData({type:'FeatureCollection',features});}
 samePiste(f,selected){return !!(selected&&selected.properties.number&&selected.properties.placeId===f.properties.placeId&&selected.properties.category===f.properties.category&&selected.properties.number===f.properties.number);}
 bind(){const m=this.host.map;if(this.bound===m)return;this.bound=m;m.on('click','winter-catalog-line',e=>{const id=e.features?.[0]?.properties.routeId;if(id)this.openRoute(id);});}
 renderCard(){
  const id=this.region.id,place=PLACES.find(p=>p.id===id);this.panel.hidden=!place?.geometryUrl||this.region.importActive;if(this.panel.hidden)return;
  const data=this.datasets[id];if(!data)return;this.bind();const key=id+':'+this.region.routeId;if(this.renderKey===key)return;this.renderKey=key;this.panel.replaceChildren();const h=this.host,selected=data.features.find(f=>f.properties.routeId===this.region.routeId);
  if(selected){
   const p=selected.properties,card=document.createElement('section');card.className='catalog-selection';h.cardTitle(card,routeKind(p.category),routeName(p));h.text(card,routeDescription(id,p),'route-description');
   if(p.category==='ski'){const c=classification(id,p);if(c.category!=='unknown')h.text(card,c.label.split(' · ')[0],'difficulty-value');}
   card.append(this.region.button('Показать участок','Показать выбранный участок',()=>this.focus(selected)));
   const details=document.createElement('details'),summary=document.createElement('summary'),a=document.createElement('a');summary.textContent='Источник';a.href=p.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent='OpenStreetMap ↗';details.append(summary,a);card.append(details);this.panel.append(card);
  }
  for(const [category,title] of [['ski','Горнолыжные трассы'],['nordic','Беговые лыжи'],['lift','Подъёмники'],['tubing','Тюбинг'],['training','Спортивные участки']]){
   const features=data.features.filter(f=>f.properties.category===category);if(!features.length)continue;const group=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('div');group.className='catalog-group';group.open=!selected||selected.properties.category===category;summary.textContent=title;list.className='catalog-routes';
   for(const [i,f] of features.entries()){const title=routeName(f.properties),label=title+(features.filter(x=>routeName(x.properties)===title).length>1?' · участок '+(i+1):'');const b=this.region.button(label,label,()=>this.openRoute(f.properties.routeId,{focus:true}));b.dataset.catalogRoute=f.properties.routeId;b.style.borderLeftColor=f.properties.displayColor;b.setAttribute('aria-pressed',String(f.properties.routeId===this.region.routeId));list.append(b);}
   group.append(summary,list);this.panel.append(group);
  }
 }

 isRoute(id){return /^([a-z-]+)\/way\/\d+$/.test(id)&&PLACES.some(p=>p.id===id.split('/')[0]&&p.geometryUrl);}
 async openRoute(id,meta={}){const place=id.split('/')[0],data=await this.ensure(place),f=data?.features.find(f=>f.properties.routeId===id);if(!f)throw Error('UNKNOWN_ROUTE');this.region.selectFeature(place,id,meta);this.renderKey=null;this.renderCard();this.layers();if(meta.focus)this.focus(f);}
 focus(feature){const data=this.datasets[feature.properties.placeId];this.host.flyToFeatures(data.features.filter(f=>f===feature||this.samePiste(f,feature)),0);}
 dispose(){this.pending.clear();this.datasets={};}
}
