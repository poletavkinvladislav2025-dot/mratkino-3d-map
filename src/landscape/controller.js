import {RODEO,rodeoMask} from './rodeo-plan.js';
import {sameInputs} from '../map-interaction.js';
import {LANDSCAPE} from './config.js';
import {tileCells,project,hash,inBox,near,mapGeometry,geometryBounds} from './spatial.js';
import {ethnopark as ethno} from './ethnopark-settings.js';
import {distanceKm} from '../region/presets.js';
export class LandscapeController{
 constructor(region){this.region=region;this.host=region.host;this.mobile=matchMedia('(max-width:760px)').matches;this.budget=this.mobile?LANDSCAPE.mobile:LANDSCAPE.desktop;this.cache=new Map();this.pending=new Map();this.jobs=new Map();this.retry=new Map();this.serial=0;this.stats={cells:0,pending:0,trees:0,unknownType:true};}
 async setup(){if(this.worker)return;this.worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});this.worker.onmessage=e=>{const job=this.jobs.get(e.data.id);if(!job)return;this.jobs.delete(e.data.id);e.data.error?job.reject(Error(e.data.error)):job.resolve(e.data.result);};this.worker.onerror=()=>{for(const j of this.jobs.values())j.reject(Error('Ландшафт временно недоступен'));this.jobs.clear();};}
 async ensureScene(){if(this.scene||this.scenePromise)return this.scenePromise;const map=this.host.map;this.scenePromise=import('./scene.js').then(({LandscapeScene})=>{if(this.region.parentSuspended||!this.region.viewportVisible||document.hidden||this.host.map!==map||map.getZoom()<LANDSCAPE.exitZoom||map.isMoving()||this.region.cameraMoving)return;this.scene=new LandscapeScene(map,this.host.ml,{budget:this.budget,mobile:this.mobile,onStats:s=>{this.stats={...this.stats,...s};this.reflect();}});map.addLayer(this.scene);this.scene.setSeason(this.region.season);this.redraw();}).catch(e=>this.region.dataError(e,'Объёмный ландшафт временно недоступен.')).finally(()=>{this.scenePromise=null;});return this.scenePromise;}
 sync(){const h=this.host,m=h.map;if(!m?.getLayer('snow'))return;if(this.bound!==m){
  if(this.bound&&this.onSource)this.bound.off('sourcedata',this.onSource);if(this.bound&&this.onIdle)this.bound.off('idle',this.onIdle);
  this.bound=m;this.onIdle=()=>{if(this.groundDirty)this.refreshGround();};m.on('idle',this.onIdle);
  this.onSource=e=>{if(e.sourceId!=='dem'||e.sourceDataType!=='content')return;this.groundDirty=true;clearTimeout(this.terrainTimer);this.terrainTimer=setTimeout(()=>{this.terrainTimer=null;this.refreshGround();},400);};m.on('sourcedata',this.onSource);
 }
  const z=m.getZoom(),visible=!this.region.parentSuspended&&this.region.viewportVisible&&!document.hidden;
  if(!visible||z<(this.active?LANDSCAPE.exitZoom:LANDSCAPE.enterZoom)){this.active=false;this.selected=[];this.abortStale(new Set());this.disposeScene();return;}
  if(m.isMoving()||this.region.cameraMoving){this.syncAnimation();return;}
  this.active=true;this.setup();this.ensureScene();const cells=tileCells(m.getCenter().toArray(),m.getBounds().toArray(),LANDSCAPE.tileZoom,this.budget.cells);this.selected=cells.map(c=>c.id);const keep=new Set(this.selected);this.abortStale(keep);
  for(const cell of cells)if(this.pending.size<2&&!this.cache.has(cell.id)&&!this.pending.has(cell.id)&&Date.now()>(this.retry.get(cell.id)||0))this.load(cell);
  for(const key of this.cache.keys())if(this.cache.size>this.budget.cacheCells&&!keep.has(key))this.cache.delete(key);
  if(this.groundDirty)this.refreshGround(false);this.redraw();
 }
 abortStale(keep){for(const [id,p] of this.pending)if(!keep.has(id)){p.abort();this.pending.delete(id);}}
 async template(){if(!this.tileJSON)this.tileJSON=fetch(LANDSCAPE.provider,{signal:this.host.abort}).then(r=>{if(!r.ok)throw Error('vector provider');return r.json();}).then(j=>{const t=j.tiles?.[0];if(!/^https:\/\/tiles\.openfreemap\.org\/planet\/[a-zA-Z0-9_/-]+\/\{z\}\/\{x\}\/\{y\}\.pbf$/.test(t))throw Error('Unsupported vector template');return t;}).catch(e=>{this.tileJSON=null;throw e;});return this.tileJSON;}
 async load(cell){const controller=new AbortController();this.pending.set(cell.id,controller);try{const template=await this.template();if(controller.signal.aborted)return;const url=template.replace('{z}',cell.z).replace('{x}',cell.x).replace('{y}',cell.y),r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('vector HTTP '+r.status);const buffer=await r.arrayBuffer();if(buffer.byteLength>LANDSCAPE.maxTileBytes)throw Error('vector size');if(controller.signal.aborted)return;
   const id=++this.serial,result=await new Promise((resolve,reject)=>{this.jobs.set(id,{resolve,reject});this.worker.postMessage({id,buffer,cell},[buffer]);});if(controller.signal.aborted||this.disposed)return;this.cache.delete(cell.id);this.cache.set(cell.id,result);this.cellRevision=(this.cellRevision||0)+1;if(this.selected.includes(cell.id))this.redraw();
  }catch(e){if(e.name!=='AbortError'&&!controller.signal.aborted){this.retry.set(cell.id,Date.now()+60000);this.stats.error='Источник ландшафта временно недоступен';this.reflect();}}finally{if(this.pending.get(cell.id)===controller)this.pending.delete(cell.id);this.reflect();if(!this.disposed&&this.active)this.sync();}}
 refreshGround(draw=true){
  if(!this.scene||this.host.map?.isMoving()||this.region.cameraMoving)return;
  this.groundDirty=false;this.groundRevision=(this.groundRevision||0)+1;this.scene.elevations.clear();if(draw)this.redraw();
 }
 masks(){const h=this.host,inputs=[this.region.filters.ski,h.resortLoaded?h.data.trails:null,h.resortLoaded?h.data.lifts:null,this.region.ski.data,...Object.values(this.region.catalog?.datasets||{})];
  if(sameInputs(this.maskInputs,inputs))return this.maskCache;this.maskInputs=inputs;
  const features=[...(this.region.filters.ski?[{geometry:rodeoMask(),properties:{}}]:[]),...(h.resortLoaded?h.data.trails.features:[]),...(h.resortLoaded?h.data.lifts.features:[]),...(this.region.ski.data?.trails.features||[]),...(this.region.ski.data?.lifts.features||[]),...(this.region.ski.data?.riderAreas.features||[]),...Object.values(this.region.catalog?.datasets||{}).flatMap(d=>d.features||[])];
  this.maskCache=features.map(f=>{const g=mapGeometry(f.geometry,project);return {g,b:geometryBounds(g),pad:f.properties.tags?.aerialway?13:f.geometry.type.includes('Polygon')?5:Math.max(12,Number(f.properties.tags?.width)||0)};});return this.maskCache;
 }
 redraw(){const s=this.scene,m=this.host.map;if(!s||!m||m.isMoving()||this.region.cameraMoving)return;const center=m.getCenter().toArray(),zoom=m.getZoom(),masks=this.masks(),forest=this.host.$('[data-layer=forest]').checked,inputs=[s,...center.map(n=>n.toFixed(6)),zoom.toFixed(2),this.cellRevision,this.groundRevision,masks,forest,this.region.filters.interesting,this.region.filters.ski,this.region.season,this.host.resortActive,...(this.selected||[])];if(sameInputs(this.redrawInputs,inputs))return;this.redrawInputs=inputs;const rate=Math.min(1,Math.max(.08,(zoom-12.7)/2.8)),points=[];
  for(const id of forest?this.selected||[]:[]){const data=this.cache.get(id);if(!data)continue;for(const p of data.points){const distance=distanceKm(center,p)*1000,density=rate*Math.min(1,Math.max(0,(this.budget.radius-distance)/(this.budget.radius*.35)));if(p[2]/4294967296>density)continue;const xy=project(p),scale=1/Math.cos(p[1]*Math.PI/180);if(masks.some(o=>inBox(xy,o.b,o.pad*scale)&&near(xy,o.g,o.pad*scale)))continue;
    const ep=project(ethno.center);if(Math.abs(xy[0]-ep[0])<ethno.pen.width*.75*scale&&Math.abs(xy[1]-ep[1])<ethno.pen.depth*.75*scale)continue;
    // Artistic pine profile only in the two documented resort scenes; unknown forest elsewhere stays mixed.
    points.push(p[3]===3&&(distanceKm(p,[58.4371909,53.9974603])<2||distanceKm(p,[58.622413,53.7959094])<2)?[p[0],p[1],p[2],4]:p);
  }}
  const cos=Math.cos(center[1]*Math.PI/180),rank=p=>((p[0]-center[0])*cos)**2+(p[1]-center[1])**2;points.sort((a,b)=>rank(a)-rank(b));s.setSaplings(this.host.resortActive?this.host.data:null);s.setTrees(forest?points.slice(0,this.budget.trees):[]);s.setForest(forest);
  const parkDistance=distanceKm(center,ethno.center),parkVisible=this.region.filters.interesting&&parkDistance<.6&&zoom>=(s.park?ethno.lod.exit:ethno.lod.enter);s.showPark(parkVisible);s.showRodeo(this.region.filters.ski&&distanceKm(center,RODEO.center)<RODEO.radiusKm&&zoom>=(s.rodeo?RODEO.exit:RODEO.enter),this.groundRevision||0);if(s.rodeo&&this.region.rodeoBagFocus&&this.region.id==='rodeo')this.region.focusRodeoBag();this.syncAnimation();this.stats.cells=this.cache.size;this.reflect();
 }
 syncAnimation(){const s=this.scene;if(s)s.setAnimation(this.region.effectsAllowed&&((s.stats.trees>0&&s.forestVisible)||!!s.park&&this.host.map.getZoom()>=ethno.lod.animate||!!s.rodeo));}
 reflect(){this.host.setAttribute('data-landscape-trees',String(this.scene?.stats.trees||0));this.host.setAttribute('data-landscape-cells',String(this.cache.size));this.host.setAttribute('data-freestyle-count',String(this.scene?.stats.freestylers||0));this.host.setAttribute('data-deer-count',String(this.scene?.stats.deer||0));this.host.setAttribute('data-landscape-state',this.scene?'ready':this.active?'loading':'distant');this.region.updateLoadStatus();}
 disposeScene(){if(this.scene){if(this.host.map?.getLayer(this.scene.id))this.host.map.removeLayer(this.scene.id);this.scene.onRemove();this.scene=null;}this.reflect();}
 dispose(){this.disposed=true;clearTimeout(this.terrainTimer);if(this.bound&&this.onSource)this.bound.off('sourcedata',this.onSource);if(this.bound&&this.onIdle)this.bound.off('idle',this.onIdle);this.abortStale(new Set());this.disposeScene();this.worker?.terminate();this.worker=null;for(const j of this.jobs.values())j.reject(new DOMException('Disposed','AbortError'));this.jobs.clear();this.cache.clear();}
}
