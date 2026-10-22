import * as THREE from 'three';
import {natureTiles,natureTreeBudget} from './nature-data.js';
import {EMPTY} from '../map-data.js';

/** Static, opt-in natural detail. Cells and GPU objects are confined to the current camera. */
export class NatureScene{
 constructor(map,ml,index,{mobile=false,url,onStats=()=>{},onError=()=>{}}){
  Object.assign(this,{map,ml,index,mobile,url,onStats,onError});this.id='hiking-nature';this.type='custom';this.renderingMode='3d';this.cache=new Map();this.pending=new Map();this.selected=[];this.forest=true;this.disposed=false;this.stats={trees:0,loadedCells:0,frames:0};
 }
 onAdd(map,gl){
  this.origin=this.ml.MercatorCoordinate.fromLngLat(map.getCenter(),0);this.units=this.origin.meterInMercatorCoordinateUnits();this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.scene.add(new THREE.AmbientLight(0xdde8e1,2));const sun=new THREE.DirectionalLight(0xfff1d4,2.4);sun.position.set(-120,180,300);this.scene.add(sun);
  this.renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:false});this.renderer.autoClear=false;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.transform=new THREE.Matrix4().makeTranslation(this.origin.x,this.origin.y,0).scale(new THREE.Vector3(this.units,-this.units,this.units));this.matrix=new THREE.Matrix4();this.dummy=new THREE.Object3D();
  this.capacity=natureTreeBudget(this.mobile);this.materials=[new THREE.MeshLambertMaterial({color:0x826e50}),new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true})];
  this.trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.7,1,1,5).rotateX(Math.PI/2),this.materials[0],this.capacity);
  const profile=[[0,-.5],[.9,-.42],[.56,-.29],[1,-.27],[.51,-.08],[.8,-.06],[.35,.14],[.55,.16],[.2,.34],[.3,.35],[0,.5]].map(p=>new THREE.Vector2(...p));
  this.crowns=new THREE.InstancedMesh(new THREE.LatheGeometry(profile,6).rotateX(Math.PI/2),this.materials[1],this.capacity);
  for(const mesh of [this.trunks,this.crowns]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;this.scene.add(mesh);}
  this.palette=[0x385e48,0x486b4b,0x55734e,0x3d6353].map(c=>new THREE.Color(c));
  this.onMove=()=>this.refresh();this.onSource=e=>{if(e.sourceId==='dem'&&e.isSourceLoaded&&!this.timer)this.timer=setTimeout(()=>{this.timer=null;if(!this.disposed)this.rebuild();},200);};map.on('moveend',this.onMove);map.on('sourcedata',this.onSource);
  this.inViewport=true;this.observer=new IntersectionObserver(entries=>{this.inViewport=!!entries[0]?.isIntersecting;if(this.inViewport)this.refresh();});this.observer.observe(map.getContainer());this.refresh();
 }
 refresh(){
  if(this.disposed)return;
  const map=this.map,tiles=natureTiles(this.index,map.getCenter().toArray(),map.getBounds().toArray(),map.getZoom(),this.mobile);this.selected=tiles.map(t=>t.id);const keep=new Set(this.selected);
  for(const [id,controller] of this.pending)if(!keep.has(id)){controller.abort();this.pending.delete(id);}
  for(const id of this.cache.keys())if(!keep.has(id))this.cache.delete(id);
  for(const tile of tiles)if(!this.cache.has(tile.id)&&!this.pending.has(tile.id)){
   const controller=new AbortController();this.pending.set(tile.id,controller);
   fetch(this.url(tile.url),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Природная сцена: HTTP '+r.status);return r.json();}).then(data=>{if(this.disposed||!this.selected.includes(tile.id)||this.pending.get(tile.id)!==controller)return;this.cache.set(tile.id,data);this.rebuild();}).catch(error=>{if(!this.disposed&&error.name!=='AbortError')this.onError(error);}).finally(()=>{if(this.pending.get(tile.id)===controller)this.pending.delete(tile.id);});
  }
  this.rebuild();
 }
 rebuild(){
  if(this.disposed||!this.trunks)return;
  const map=this.map,visible=map.getZoom()>=14.2,bounds=map.getBounds(),center=map.getCenter().toArray();let count=0;const candidates=[];const surfaces=[];
  for(const id of this.selected){const cell=this.cache.get(id);if(!cell)continue;surfaces.push(...cell.surfaces.features);if(visible&&this.forest)for(const p of cell.trees)if(bounds.contains(p.slice(0,2)))candidates.push(p);}
  candidates.sort((a,b)=>((a[0]-center[0])*.59)**2+(a[1]-center[1])**2-(((b[0]-center[0])*.59)**2+(b[1]-center[1])**2));
  const put=(mesh,i,x,y,z,r,sx,sy,sz)=>{this.dummy.position.set(x,y,z);this.dummy.rotation.set(0,0,r);this.dummy.scale.set(sx,sy,sz);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);};
  this.placedTrees=[];
  for(const [lon,lat,seed] of candidates){
   if(count>=this.capacity)break;const elevation=map.queryTerrainElevation([lon,lat]);if(!Number.isFinite(elevation))continue;
   const coordinate=this.ml.MercatorCoordinate.fromLngLat([lon,lat]),x=(coordinate.x-this.origin.x)/this.units,y=(this.origin.y-coordinate.y)/this.units,h=16+(seed%1400)/100,r=2.5+(seed%150)/100,rotation=(seed%628)/100;
   put(this.trunks,count,x,y,elevation+h*.28,rotation,.32,.32,h*.56);put(this.crowns,count,x,y,elevation+h*.72,rotation,r,r*.84,h*.56);this.crowns.setColorAt(count,this.palette[seed%this.palette.length]);this.placedTrees.push([lon,lat,elevation]);count++;
  }
  for(const mesh of [this.trunks,this.crowns]){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}if(this.crowns.instanceColor)this.crowns.instanceColor.needsUpdate=true;
  map.getSource('nature-surfaces')?.setData({type:'FeatureCollection',features:visible?surfaces:[]});this.stats.trees=count;this.stats.loadedCells=this.cache.size;this.onStats({...this.stats});map.triggerRepaint();
 }
 setForest(value){this.forest=value;this.rebuild();}
 render(gl,args){if(this.disposed||!this.inViewport)return;this.camera.projectionMatrix.copy(this.matrix.fromArray(args.defaultProjectionData.mainMatrix)).multiply(this.transform);this.renderer.resetState();this.renderer.setViewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);this.renderer.render(this.scene,this.camera);this.renderer.resetState();this.stats.frames++;}
 onRemove(){
  if(this.disposed)return;this.disposed=true;clearTimeout(this.timer);this.timer=null;for(const controller of this.pending.values())controller.abort();this.pending.clear();this.cache.clear();this.observer?.disconnect();this.map.off('moveend',this.onMove);this.map.off('sourcedata',this.onSource);this.map.getSource('nature-surfaces')?.setData(EMPTY);
  for(const mesh of [this.trunks,this.crowns]){mesh?.geometry.dispose();mesh?.dispose();}this.materials?.forEach(m=>m.dispose());this.renderer?.dispose();this.placedTrees=[];
 }
}
