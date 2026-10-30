import {catalogLifeData} from './catalog-life-data.js';
import {byId} from './presets.js';
export class CatalogLifeController{
 constructor(region){this.region=region;this.serial=0;}
 async ensure(id){if(this.scene&&this.place===id)return;this.dispose();const token=this.serial,h=this.region.host,map=h.map,catalog=this.region.catalog.datasets[id],place=byId(id);if(!catalog||!place)return;
 const {ResortScene}=await import('../resort-scene.js');if(token!==this.serial||map!==h.map||this.region.context!==id||!this.region.sceneVisible||this.region.cameraMoving||map.isMoving()||map.getZoom()<13.4)return;
 const mobile=matchMedia('(max-width:760px)').matches,{data,profile}=catalogLifeData(place,catalog,mobile);if(!data.trails.features.length&&!data.lifts.features.length)return;
 this.place=id;const scene=new ResortScene(map,h.ml,data,{mobile,profile,onStats:stats=>{if(this.scene!==scene)return;h.setAttribute('data-resort-riders',String(stats.riders||0));h.setAttribute('data-resort-snowboarders',String(stats.snowboarders||0));h.setAttribute('data-resort-vehicles',String(stats.vehicles||0));this.region.reflectLife();}});this.scene=scene;h.setAttribute('data-resort-life-place',id);map.addLayer(scene);scene.setLayers({forest:false,lifts:h.$('[data-layer=lifts]').checked});scene.setPaused(!this.region.effectsAllowed);
 }
 dispose(){this.serial++;const scene=this.scene;this.scene=null;this.place=null;if(scene){if(this.region.host.map?.getLayer(scene.id))this.region.host.map.removeLayer(scene.id);if(!scene.disposed)scene.onRemove();}const h=this.region.host;h.removeAttribute('data-resort-life-place');for(const name of ['riders','snowboarders','vehicles'])h.setAttribute('data-resort-'+name,'0');}
}
