import * as THREE from 'three';

const meters=(a,b)=>Math.hypot((b[0]-a[0])*111320*Math.cos((a[1]+b[1])*Math.PI/360),(b[1]-a[1])*111320);
/** Each source feature is a separate path. Endpoints are never linked across gaps. */
export function trainPaths(data){
 return data.features.filter(f=>['north','south','tukan'].includes(f.properties?.line)&&f.geometry.type==='LineString').map(f=>{
  const points=f.geometry.coordinates,distances=[0];for(let i=1;i<points.length;i++)distances.push(distances.at(-1)+meters(points[i-1],points[i]));
  return {points,distances,length:distances.at(-1),osmWay:f.properties.osm_way};
 }).filter(p=>p.length>1000);
}
export function trainSample(path,distance){
 const d=Math.max(0,Math.min(path.length,distance));let lo=1,hi=path.distances.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(path.distances[mid]<d)lo=mid+1;else hi=mid;}
 const i=lo,a=path.points[i-1],b=path.points[i],span=path.distances[i]-path.distances[i-1],t=span?(d-path.distances[i-1])/span:0;
 return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
}

/** Approximate Gr-series 0-8-0 steam locomotive, tender and one small carriage, in metres. */
export function steamTrain(){
 const group=new THREE.Group(),wheels=[],materials={};
 for(const [name,color] of Object.entries({black:0x242a29,green:0x214e3b,red:0x9c352e,brass:0xb08d57,glass:0x99b4b5,coal:0x171b1a,wood:0x796149}))materials[name]=new THREE.MeshLambertMaterial({color,flatShading:true});
 const geometries=[];
 function mesh(geometry,material,x,y,z){geometries.push(geometry);const m=new THREE.Mesh(geometry,materials[material]);m.position.set(x,y,z);group.add(m);return m;}
 const box=(x,y,z,w,l,h,m)=>mesh(new THREE.BoxGeometry(w,l,h),m,x,y,z);
 box(0,0,.8,1.8,6.5,.35,'red');
 mesh(new THREE.CylinderGeometry(.77,.77,4.5,12),'black',0,.9,1.95);
 mesh(new THREE.CylinderGeometry(.26,.38,1.25,9).rotateX(Math.PI/2),'black',0,2.25,3);
 mesh(new THREE.CylinderGeometry(.28,.28,.5,9).rotateX(Math.PI/2),'brass',0,.4,2.85);
 box(0,-2,2.05,2.05,1.8,2.25,'green');box(0,-2,3.24,2.3,2.05,.18,'black');
 for(const x of [-1.04,1.04]){box(x,-1.6,2.5,.03,.65,.7,'glass');box(x,-2.45,2.5,.03,.5,.7,'glass');}
 box(0,-1.08,2.5,.8,.04,.65,'glass');
 box(0,3.25,1,2.05,.35,.25,'red');box(0,3.33,2.1,.4,.18,.4,'brass');
 // Four coupled driving axles characteristic of the GR series.
 for(const y of [-1.7,-.65,.4,1.45])for(const x of [-.9,.9])wheels.push(mesh(new THREE.CylinderGeometry(.57,.57,.18,12).rotateZ(Math.PI/2),'red',x,y,.64));
 for(const x of [-1.04,1.04])box(x,-.1,.65,.09,3.6,.12,'brass');
 box(0,-4.05,.65,.18,1,.18,'black');box(0,-6.1,1.35,2,2.8,1.35,'green');box(0,-6.1,2.05,1.75,2.5,.18,'coal');
 box(0,-8.1,.65,.18,1,.18,'black');box(0,-11,1.8,2.15,4.6,2.3,'wood');box(0,-11,3,2.35,4.9,.2,'green');
 for(const x of [-1.09,1.09])for(const y of [-9.6,-10.6,-11.6,-12.6])box(x,y,2.2,.035,.65,.8,'glass');
 for(const y of [-5.3,-6.9,-9.6,-12.4])for(const x of [-.95,.95])wheels.push(mesh(new THREE.CylinderGeometry(.38,.38,.16,9).rotateZ(Math.PI/2),'black',x,y,.47));

 return {group,wheels,dispose(){for(const g of geometries)g.dispose();for(const m of Object.values(materials))m.dispose();}};
}

export class BuzhdTrainScene{
 constructor(region,data){this.region=region;this.map=region.host.map;this.ml=region.host.ml;this.paths=trainPaths(data);this.id='buzhd-trains';this.type='custom';this.renderingMode='3d';this.elapsed=0;}
 onAdd(map,gl){
  this.origin=this.ml.MercatorCoordinate.fromLngLat([58.33854,53.95218]);this.units=this.origin.meterInMercatorCoordinateUnits();
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.scene.add(new THREE.AmbientLight(0xe7efea,2));const light=new THREE.DirectionalLight(0xffefda,2.5);light.position.set(-100,80,200);this.scene.add(light);
  this.model=steamTrain();this.static=this.model.group;this.moving=this.static.clone(true);for(const part of this.static.children)if(part.position.y<-8)part.visible=false;this.scene.add(this.static,this.moving);
  this.renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:false});this.renderer.autoClear=false;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.transform=new THREE.Matrix4().makeTranslation(this.origin.x,this.origin.y,0).scale(new THREE.Vector3(this.units,-this.units,this.units));this.matrix=new THREE.Matrix4();
  this.media=matchMedia('(prefers-reduced-motion: reduce)');this.onMedia=()=>map.triggerRepaint();this.media.addEventListener('change',this.onMedia);this.choosePath();this.last=performance.now();this.tick=()=>{if(this.disposed)return;if(this.selected&&this.region.buzhd.visible&&this.region.buzhd.trains&&this.region.sceneVisible&&map.getZoom()>=14&&!map.isMoving()&&!this.media.matches)map.triggerRepaint();this.timer=setTimeout(this.tick,this.elapsed%180<85?80:1000);};this.timer=setTimeout(this.tick,80);this.onMove=()=>{this.choosePath();map.triggerRepaint();};map.on('moveend',this.onMove);
 }
 choosePath(){
  const c=this.map.getCenter().toArray(),bounds=this.map.getBounds();let best=null;
  for(const path of this.paths)for(let i=0;i<path.points.length;i++){const p=path.points[i];if(!bounds.contains(p))continue;const d=meters(c,p);if(!best||d<best.d)best={path,d,start:Math.max(0,Math.min(path.length-650,path.distances[i]-100))};}
  if(best?.path!==this.selected?.path){this.selected=best;this.elapsed=0;}else if(best)this.selected=best;
 }
 place(group,p,next){
  const z=this.map.queryTerrainElevation(p);if(!Number.isFinite(z)||!this.map.getBounds().contains(p)){group.visible=false;return false;}
  const c=this.ml.MercatorCoordinate.fromLngLat(p),scale=c.meterInMercatorCoordinateUnits()/this.units;group.position.set((c.x-this.origin.x)/this.units,(this.origin.y-c.y)/this.units,z*scale);group.scale.setScalar(scale);
  if(next){const n=this.ml.MercatorCoordinate.fromLngLat(next),nz=this.map.queryTerrainElevation(next);group.rotation.z=-Math.atan2(n.x-c.x,c.y-n.y);group.rotation.x=Number.isFinite(nz)?Math.atan2(nz-z,Math.max(.1,meters(p,next))):0;}
  group.visible=true;return true;
 }
 render(gl,args){
  if(this.disposed)return;const now=performance.now(),active=this.region.buzhd.visible&&this.region.sceneVisible&&this.map.getZoom()>=14;
  const motion=active&&this.region.buzhd.trains&&!this.media.matches&&!this.map.isMoving();if(motion)this.elapsed+=Math.min(1.1,(now-this.last)/1000);this.last=now;
  this.static.visible=false;this.moving.visible=false;
  if(active)this.place(this.static,[58.33854,53.95218],[58.33854,53.95228]);
  if(motion&&this.selected&&this.elapsed%180<85){const {path,start}=this.selected,d=start+(this.elapsed%180)*6;this.place(this.moving,trainSample(path,d),trainSample(path,d+3));this.moving.traverse(o=>{if(o.isMesh&&o.geometry.type==='CylinderGeometry'&&o.position.z<.9)o.rotation.x=-d/.57;});}
  this.region.host.setAttribute('data-buzhd-trains',this.moving.visible?'1':'0');this.region.host.setAttribute('data-buzhd-train-model',String(this.static.visible));
  if(active){this.camera.projectionMatrix.copy(this.matrix.fromArray(args.defaultProjectionData.mainMatrix)).multiply(this.transform);this.renderer.resetState();this.renderer.setViewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);this.renderer.render(this.scene,this.camera);this.renderer.resetState();}

 }
 onRemove(){if(this.disposed)return;this.disposed=true;clearTimeout(this.timer);this.map.off('moveend',this.onMove);this.media?.removeEventListener('change',this.onMedia);this.model?.dispose();this.renderer?.dispose();this.region.host.removeAttribute('data-buzhd-trains');this.region.host.removeAttribute('data-buzhd-train-model');}
}
