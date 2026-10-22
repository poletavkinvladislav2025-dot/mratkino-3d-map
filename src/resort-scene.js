import * as THREE from 'three';
import { SUMMIT } from './map-data.js';
import { treePlacements, toLocal, toLngLat, pathLength, samplePath, liftLoop } from './resort-scene-data.js';

/** Opt-in, procedural 3D illustration. No external models, textures or live-status claims. */
export class ResortScene {
 constructor(map,ml,data,{mobile=false,onStats=()=>{}}={}){
  this.id='resort-life';this.type='custom';this.renderingMode='3d';
  this.map=map;this.ml=ml;this.data=data;this.mobile=mobile;this.onStats=onStats;
  this.enabled=true;this.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.forestVisible=true;this.liftsVisible=true;this.elapsed=0;this.lastTime=null;this.disposed=false;
  this.origin=ml.MercatorCoordinate.fromLngLat(SUMMIT,0);this.units=this.origin.meterInMercatorCoordinateUnits();
  this.objects=[];this.resources=new Set();this.treePoints=treePlacements(data,mobile?450:1200);
  this.stats={trees:0,saplings:0,lifts:0,vehicles:0,frames:0,elapsed:0};
 }
 onAdd(map,gl){
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();
  this.scene.add(new THREE.AmbientLight(0xdce9ee,2));
  const sun=new THREE.DirectionalLight(0xfff5df,2.5);sun.position.set(-100,-150,250);this.scene.add(sun);
  this.renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:false});
  this.renderer.autoClear=false;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.transform=new THREE.Matrix4().makeTranslation(this.origin.x,this.origin.y,0).scale(new THREE.Vector3(this.units,-this.units,this.units));
  this.matrix=new THREE.Matrix4();this.dummy=new THREE.Object3D();
  this.forest=new THREE.Group();this.vehicles=new THREE.Group();this.scene.add(this.forest,this.vehicles);
  this.makeTrees();this.makeLifts();this.refreshTerrain();
  this.visibility=()=>{this.lastTime=null;this.schedule();};document.addEventListener('visibilitychange',this.visibility);
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.motionChange=()=>{if(this.motion.matches)this.setPaused(true);};this.motion.addEventListener('change',this.motionChange);
  this.onMove=()=>this.refreshTerrain();map.on('moveend',this.onMove);
  this.onSource=e=>{if(e.sourceId==='dem'&&e.isSourceLoaded&&!this.terrainTimer)this.terrainTimer=setTimeout(()=>{this.terrainTimer=null;if(!this.disposed)this.refreshTerrain();},200);};map.on('sourcedata',this.onSource);
  this.schedule();
 }
 material(color){const material=new THREE.MeshLambertMaterial({color,flatShading:true});this.resources.add(material);return material;}
 geometry(geometry){return geometry;}
 batch(geometry,material,count,parent){
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);parent.add(mesh);return mesh;
 }
 local(lngLat){const p=this.ml.MercatorCoordinate.fromLngLat(lngLat);return [(p.x-this.origin.x)/this.units,(this.origin.y-p.y)/this.units];}
 height(lngLat){const value=this.map.queryTerrainElevation(lngLat);return Number.isFinite(value)?value:null;}
 makeTrees(){
  const cone=this.geometry(new THREE.ConeGeometry(1,1,7).rotateX(Math.PI/2));
  const trunk=this.geometry(new THREE.CylinderGeometry(.12,.2,1,5).rotateX(Math.PI/2));
  const count=this.treePoints.length;
  this.trunks=this.batch(trunk,this.material(0x6b5948),count,this.forest);
  this.treeTiers=[0,1,2].map((_,i)=>this.batch(cone,this.material([0x315b4c,0x3e6b56,0x507e65][i]),count,this.forest));
  this.snow=this.batch(cone,this.material(0xe9f1ed),count,this.forest);
 }
 makeLifts(){
  this.routes=[];
  for(const feature of this.data.lifts.features){
   if(feature.geometry.type!=='LineString')continue;
   const chair=feature.properties.tags?.aerialway==='chair_lift';
   this.routes.push({feature,chair,count:this.mobile?(chair?12:6):(chair?24:10),points:[],length:0});
  }
  this.stats.lifts=this.routes.length;
  this.parts=[];const box=this.geometry(new THREE.BoxGeometry(1,1,1)),sphere=this.geometry(new THREE.SphereGeometry(1,6,4));
  const steel=this.material(0x686d78),seat=this.material(0xc88a54),clothes=this.material(0x326f87),red=this.material(0xb95b46),skin=this.material(0xf1ceb0),skis=this.material(0x3e4651);
  const add=(kind,geometry,material,position,scale,filter=()=>true)=>{
   const count=this.routes.filter(r=>r.chair===(kind==='chair')).reduce((n,r)=>n+r.count,0);
   this.parts.push({kind,position,scale,filter,mesh:this.batch(geometry,material,count,this.vehicles)});
  };
  // Open bench, back, hangers and safety rail; three illustrative passengers.
  add('chair',box,steel,[0,0,-1.3],[.07,.07,2.6]);
  add('chair',box,seat,[0,0,-2.65],[2.15,.6,.16]);
  add('chair',box,seat,[0,-.27,-2.28],[2.15,.1,.65]);
  for(const x of [-1.02,1.02])add('chair',box,steel,[x,0,-2.25],[.06,.65,.8]);
  add('chair',box,steel,[0,.32,-2.1],[2.15,.06,.06]);
  for(const [index,x] of [-.7,0,.7].entries()){
   const occupied=vehicle=>vehicle.index%3!==1; // Leave some chairs empty.
   add('chair',box,index===1?red:clothes,[x,0,-2.22],[.38,.32,.55],occupied);
   add('chair',sphere,skin,[x,0,-1.78],[.19,.19,.2],occupied);
   for(const dx of [-.11,.11]){
    add('chair',box,skis,[x+dx,.18,-2.98],[.1,.14,.65],occupied);
    add('chair',box,skis,[x+dx,.4,-3.32],[.08,1.5,.045],occupied);
   }
  }
  add('drag',box,steel,[0,0,-.7],[.05,.05,1.4]);
  add('drag',box,steel,[0,0,-1.4],[.7,.06,.06]);
  add('drag',box,red,[.15,0,-1.35],[.36,.28,.6],v=>v.index%2===0);
  add('drag',sphere,skin,[.15,0,-.85],[.17,.17,.19],v=>v.index%2===0);
  for(const dx of [-.1,.1]){
   add('drag',box,skis,[.15+dx,0,-1.95],[.1,.12,.6],v=>v.index%2===0);
   add('drag',box,skis,[.15+dx,.25,-2.26],[.08,1.4,.045],v=>v.index%2===0);
  }
  this.cableMaterial=new THREE.LineBasicMaterial({color:0x797184});this.resources.add(this.cableMaterial);
  this.stats.vehicles=this.routes.reduce((n,r)=>n+r.count,0);
 }
 refreshTerrain(){
  if(this.disposed||!this.scene)return;
  let forest=0,saplings=0;
  this.treePoints.forEach((tree,i)=>{
   const elevation=this.height(tree.lngLat),[x,y]=this.local(tree.lngLat),h=tree.height;
   const visible=elevation!==null;
   if(visible){if(tree.kind==='sapling')saplings++;else forest++;}
   const put=(mesh,z,radius,height)=>{
    this.dummy.position.set(x,y,(elevation||0)+z);this.dummy.rotation.set(0,0,tree.rotation);
    this.dummy.scale.set(visible?radius:0,visible?radius:0,visible?height:0);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);
   };
   put(this.trunks,h*.24,1,h*.48);
   this.treeTiers.forEach((mesh,tier)=>put(mesh,h*[.42,.65,.84][tier],tree.radius*[1,.77,.5][tier],h*[.65,.5,.36][tier]));
   put(this.snow,h*.94,tree.radius*.3,h*.2);
  });
  for(const mesh of [this.trunks,...this.treeTiers,this.snow])mesh.instanceMatrix.needsUpdate=true;
  this.stats.trees=forest;this.stats.saplings=saplings;
  for(const route of this.routes){
   let coordinates=route.feature.geometry.coordinates;
   const first=this.height(coordinates[0]),last=this.height(coordinates.at(-1));
   if(first===null||last===null){route.points=[];route.length=0;if(route.cable)route.cable.visible=false;continue;}
   if(first>last)coordinates=[...coordinates].reverse();
   const flat=coordinates.map(toLocal),length=pathLength(flat),line=[];
   for(let d=0;d<length;d+=18){const ll=toLngLat(samplePath(flat,d).point),z=this.height(ll);if(z===null)continue;const [x,y]=this.local(ll);line.push([x,y,z+(route.chair?7:2.4)]);}
   const end=coordinates.at(-1),[x,y]=this.local(end);line.push([x,y,this.height(end)+(route.chair?7:2.4)]);
   if(line.length<2)continue;
   route.points=liftLoop(line,route.chair?2.2:1);route.length=pathLength(route.points);
   if(route.cable){route.cable.geometry.dispose();route.cable.geometry=new THREE.BufferGeometry().setFromPoints(route.points.map(p=>new THREE.Vector3(...p)));route.cable.visible=true;}
   else {route.cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.points.map(p=>new THREE.Vector3(...p))),this.cableMaterial);this.vehicles.add(route.cable);}
  }
  this.updateVehicles();this.onStats({...this.stats});this.map.triggerRepaint();
 }
 updateVehicles(){
  const groups={chair:[],drag:[]};
  for(const route of this.routes)for(let index=0;index<route.count;index++){
   const distance=route.length?((index/route.count)*route.length+this.elapsed*(route.chair?2.1:1.5))%route.length:0;
   const sample=route.length?samplePath(route.points,distance):null;
   groups[route.chair?'chair':'drag'].push({index,sample});
  }
  for(const part of this.parts){
   groups[part.kind].forEach((vehicle,i)=>{
    const {sample}=vehicle,visible=!!sample&&part.filter(vehicle);
    if(sample){
     const angle=sample.angle-Math.PI/2,c=Math.cos(angle),s=Math.sin(angle),[x,y,z]=part.position;
     this.dummy.position.set(sample.point[0]+x*c-y*s,sample.point[1]+x*s+y*c,sample.point[2]+z);this.dummy.rotation.set(0,0,angle);
    }
    this.dummy.scale.set(...part.scale.map(v=>visible?v:0));this.dummy.updateMatrix();part.mesh.setMatrixAt(i,this.dummy.matrix);
   });part.mesh.instanceMatrix.needsUpdate=true;
  }
 }
 setEnabled(value){this.enabled=value;this.lastTime=null;this.schedule();this.map.triggerRepaint();}
 setPaused(value){this.paused=value;this.lastTime=null;this.schedule();this.onStats({...this.stats,paused:value});}
 setLayers({forest,lifts}){this.forestVisible=forest;this.liftsVisible=lifts;this.schedule();this.map.triggerRepaint();}
 schedule(){
  clearTimeout(this.timer);this.timer=null;
  if(this.disposed||!this.enabled||this.paused||document.hidden||!this.liftsVisible)return;
  this.timer=setTimeout(()=>{this.timer=null;if(!this.disposed)this.map.triggerRepaint();},1000/(this.mobile?18:24));
 }
 render(gl,args){
  if(this.disposed||!this.enabled)return;
  const now=performance.now();
  if(!this.paused&&!document.hidden&&this.liftsVisible){if(this.lastTime!==null)this.elapsed+=Math.min((now-this.lastTime)/1000,.15);this.lastTime=now;this.updateVehicles();}
  else this.lastTime=null;
  this.forest.visible=this.forestVisible&&this.map.getZoom()>=13.5;
  this.vehicles.visible=this.liftsVisible;
  this.camera.projectionMatrix.copy(this.matrix.fromArray(args.defaultProjectionData.mainMatrix)).multiply(this.transform);
  this.renderer.resetState();this.renderer.setViewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);this.renderer.render(this.scene,this.camera);this.renderer.resetState();
  this.stats.frames++;this.stats.elapsed=this.elapsed;this.schedule();
 }
 onRemove(){
  if(this.disposed)return;
  this.disposed=true;clearTimeout(this.timer);clearTimeout(this.terrainTimer);this.timer=null;this.terrainTimer=null;
  document.removeEventListener('visibilitychange',this.visibility);this.motion?.removeEventListener('change',this.motionChange);
  this.map.off('moveend',this.onMove);this.map.off('sourcedata',this.onSource);
  const geometries=new Set();this.scene?.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.isInstancedMesh)object.dispose();});
  geometries.forEach(g=>g.dispose());this.resources.forEach(r=>r.dispose());this.renderer?.dispose();
 }
}
