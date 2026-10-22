import * as THREE from 'three';
import { SUMMIT } from './map-data.js';
import { saplingPlacements, forestLOD, treeAppearance, liftVehicle, toLocal, toLngLat, pathLength, samplePath, liftLoop } from './resort-scene-data.js';

/** Opt-in, procedural 3D illustration. No external models, textures or live-status claims. */
export class ResortScene {
 constructor(map,ml,data,{mobile=false,forestInstances,onStats=()=>{}}={}){
  this.id='resort-life';this.type='custom';this.renderingMode='3d';
  this.map=map;this.ml=ml;this.data=data;this.mobile=mobile;this.onStats=onStats;
  this.enabled=true;this.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.forestVisible=true;this.liftsVisible=true;this.elapsed=0;this.lastTime=null;this.disposed=false;
  this.origin=ml.MercatorCoordinate.fromLngLat(SUMMIT,0);this.units=this.origin.meterInMercatorCoordinateUnits();
  this.resources=new Set();this.forestInstances=forestInstances;this.saplings=saplingPlacements(data);
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
 material(color,flatShading=true){const material=new THREE.MeshLambertMaterial({color,flatShading});this.resources.add(material);return material;}
 geometry(geometry){return geometry;}
 batch(geometry,material,count,parent){
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);parent.add(mesh);return mesh;
 }
 local(lngLat){const p=this.ml.MercatorCoordinate.fromLngLat(lngLat);return [(p.x-this.origin.x)/this.units,(this.origin.y-p.y)/this.units];}
 height(lngLat){const value=this.map.queryTerrainElevation(lngLat);return Number.isFinite(value)?value:null;}
 makeTrees(){
  const crown=this.geometry(new THREE.IcosahedronGeometry(1,0));
  const nearCrown=this.geometry(new THREE.IcosahedronGeometry(1,1));
  const cone=this.geometry(new THREE.ConeGeometry(1,1,7).rotateX(Math.PI/2));
  const trunk=this.geometry(new THREE.CylinderGeometry(.7,1,1,6).rotateX(Math.PI/2));
  this.nearCapacity=this.mobile?2500:6500;
  this.farCapacity=Math.ceil(this.forestInstances.count/(this.mobile?8:4)*1.2);
  this.trunks=this.batch(trunk,this.material(0x94705b),this.nearCapacity,this.forest);
  this.nearCrowns=[0,1].map(()=>this.batch(nearCrown,this.material(0xffffff,false),this.nearCapacity,this.forest));
  this.farTrunks=this.batch(trunk,this.material(0x796a55),this.farCapacity,this.forest);
  this.farCrowns=this.batch(crown,this.material(0xffffff),this.farCapacity,this.forest);
  this.palette=[0x3b5845,0x476349,0x526c4a,0x405c4c].map(color=>new THREE.Color(color));
  this.saplingTrunks=this.batch(trunk,this.material(0x79624e),this.saplings.length,this.forest);
  this.saplingTiers=[0,1,2].map((_,i)=>this.batch(cone,this.material([0x315b4c,0x3e6b56,0x507e65][i]),this.saplings.length,this.forest));
 }
 refreshForest(){
  const pool=this.forestInstances,lod=forestLOD(pool,this.map.getCenter().toArray(),{mobile:this.mobile,zoom:this.map.getZoom(),bounds:this.map.getBounds().toArray()});
  const near=lod.near.slice(0,this.nearCapacity),far=lod.far.slice(0,this.farCapacity);
  const put=(mesh,i,x,y,z,rotation,sx,sy,sz)=>{this.dummy.position.set(x,y,z);this.dummy.rotation.set(0,0,rotation);this.dummy.scale.set(sx,sy,sz);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);};
  near.forEach((id,i)=>{
   const [x,y,base]=pool.positions.subarray(id*3,id*3+3),ll=toLngLat([x,y]),[mx,my]=this.local(ll);
   const z=this.height(ll)??base,{height:h,radius:r,rotation}=treeAppearance(pool.seeds[id]);
   put(this.trunks,i,mx,my,z+h*.34,rotation,.27+h*.004,.27+h*.004,h*.68);
   put(this.nearCrowns[0],i,mx,my,z+h*.76,rotation,r,r*.91,h*.245);
   put(this.nearCrowns[1],i,mx+r*.25,my-r*.12,z+h*.9,rotation+1,r*.72,r*.8,h*.13);
   for(const mesh of this.nearCrowns)mesh.setColorAt(i,this.palette[(pool.seeds[id]>>>3)%this.palette.length]);
  });
  far.forEach((id,i)=>{
   const [x,y,z]=pool.positions.subarray(id*3,id*3+3),[mx,my]=this.local(toLngLat([x,y]));
   const {height:h,radius:r,rotation}=treeAppearance(pool.seeds[id]),cluster=this.mobile?3.5:2.5;
   // A distant crown is a stand of trees; full individual trunks replace it nearby.
   put(this.farTrunks,i,mx,my,z+h*.34,rotation,.5,.5,h*.68);
   put(this.farCrowns,i,mx,my,z+h*.77,rotation,r*cluster,r*cluster*.94,h*.26);
   this.farCrowns.setColorAt(i,this.palette[(pool.seeds[id]>>>3)%this.palette.length]);
  });
  for(const mesh of [this.trunks,...this.nearCrowns]){mesh.count=near.length;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  this.farTrunks.count=far.length;this.farTrunks.instanceMatrix.needsUpdate=true;
  this.farCrowns.count=far.length;this.farCrowns.instanceMatrix.needsUpdate=true;if(this.farCrowns.instanceColor)this.farCrowns.instanceColor.needsUpdate=true;
  let saplings=0;
  for(const tree of this.saplings){
   const z=this.height(tree.lngLat);if(z===null)continue;
   const [x,y]=this.local(tree.lngLat),h=tree.height,r=tree.radius,i=saplings++;
   put(this.saplingTrunks,i,x,y,z+h*.23,tree.rotation,.08,.08,h*.46);
   this.saplingTiers.forEach((mesh,tier)=>put(mesh,i,x,y,z+h*[.4,.65,.83][tier],tree.rotation,r*[1,.75,.48][tier],r*[1,.75,.48][tier],h*[.62,.48,.34][tier]));
  }
  for(const mesh of [this.saplingTrunks,...this.saplingTiers]){mesh.count=saplings;mesh.instanceMatrix.needsUpdate=true;}
  this.stats.trees=near.length;this.stats.canopyClusters=far.length;this.stats.forestCandidates=pool.count;this.stats.saplings=saplings;
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
  const add=(kind,geometry,material,position,scale,filter=()=>true,anchor='cable')=>{
   const count=this.routes.filter(r=>r.chair===(kind==='chair')).reduce((n,r)=>n+r.count,0);
   this.parts.push({kind,position,scale,filter,anchor,mesh:this.batch(geometry,material,count,this.vehicles)});
  };
  // Open bench, back, hangers and safety rail; three illustrative passengers.
  add('chair',box,steel,[0,0,-1.3],[.07,.07,2.6]);
  add('chair',box,seat,[0,0,-2.65],[2.15,.6,.16]);
  add('chair',box,seat,[0,-.27,-2.28],[2.15,.1,.65]);
  for(const x of [-1.02,1.02])add('chair',box,steel,[x,0,-2.25],[.06,.65,.8]);
  add('chair',box,steel,[0,.32,-2.1],[2.15,.06,.06]);
  for(const [index,x] of [-.7,0,.7].entries()){
   const occupied=vehicle=>vehicle.ascending&&vehicle.index%3!==1; // Leave some chairs empty.
   add('chair',box,index===1?red:clothes,[x,0,-2.22],[.38,.32,.55],occupied);
   add('chair',sphere,skin,[x,0,-1.78],[.19,.19,.2],occupied);
   for(const dx of [-.11,.11]){
    add('chair',box,skis,[x+dx,.18,-2.98],[.1,.14,.65],occupied);
    add('chair',box,skis,[x+dx,.4,-3.32],[.08,1.5,.045],occupied);
   }
  }
  // Single-person platter: stem + disc, with skis on the snow on the uphill branch.
  const disc=this.geometry(new THREE.CylinderGeometry(.21,.21,.06,10).rotateX(Math.PI/2));
  add('drag',box,steel,[0,0,-1.15],[.045,.045,2.3]);
  add('drag',disc,steel,[0,0,-2.3],[1,1,1]);
  const riding=v=>v.ascending&&v.index%3!==1;
  add('drag',box,red,[0,-.12,-1.05],[.36,.28,.62],riding,'ground');
  add('drag',sphere,skin,[0,-.12,-.56],[.17,.17,.19],riding,'ground');
  for(const dx of [-.1,.1]){
   add('drag',box,skis,[dx,-.12,-1.64],[.1,.12,.6],riding,'ground');
   add('drag',box,skis,[dx,.1,-1.97],[.08,1.55,.045],riding,'ground');
  }
  for(const side of [-1,1]){add('drag',box,red,[side*.22,-.03,-.89],[.11,.32,.16],riding,'ground');add('drag',sphere,skin,[side*.13,.1,-.87],[.07,.07,.07],riding,'ground');}
  this.cableMaterial=new THREE.LineBasicMaterial({color:0x797184});this.resources.add(this.cableMaterial);
  this.stats.vehicles=this.routes.reduce((n,r)=>n+r.count,0);
 }
 refreshTerrain(){
  if(this.disposed||!this.scene)return;
  this.refreshForest();
  for(const route of this.routes){
   let coordinates=route.feature.geometry.coordinates;
   const first=this.height(coordinates[0]),last=this.height(coordinates.at(-1));
   if(first===null||last===null){route.points=[];route.length=0;if(route.cable)route.cable.visible=false;continue;}
   if(first>last)coordinates=[...coordinates].reverse();
   const flat=coordinates.map(toLocal),length=pathLength(flat),line=[];
   for(let d=0;d<length;d+=18){const ll=toLngLat(samplePath(flat,d).point),z=this.height(ll);if(z===null)continue;const [x,y]=this.local(ll);line.push([x,y,z+(route.chair?7:3.1)]);}
   const end=coordinates.at(-1),[x,y]=this.local(end);line.push([x,y,this.height(end)+(route.chair?7:3.1)]);
   if(line.length<2)continue;
   route.ascentLength=pathLength(line);route.points=liftLoop(line,route.chair?2.2:1);route.length=pathLength(route.points);
   if(route.cable){route.cable.geometry.dispose();route.cable.geometry=new THREE.BufferGeometry().setFromPoints(route.points.map(p=>new THREE.Vector3(...p)));route.cable.visible=true;}
   else {route.cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.points.map(p=>new THREE.Vector3(...p))),this.cableMaterial);this.vehicles.add(route.cable);}
  }
  this.updateVehicles();this.onStats({...this.stats});this.map.triggerRepaint();
 }
 updateVehicles(){
  const groups={chair:[],drag:[]};
  for(const route of this.routes)for(let index=0;index<route.count;index++){
   const vehicle=liftVehicle(route,index,this.elapsed);
   if(vehicle.sample){
    const [x,y]=vehicle.sample.point,ll=new this.ml.MercatorCoordinate(this.origin.x+x*this.units,this.origin.y-y*this.units).toLngLat();
    vehicle.ground=(this.height(ll)??vehicle.sample.point[2]-(route.chair?7:3.1))+2;
   }
   groups[route.chair?'chair':'drag'].push(vehicle);
  }
  for(const part of this.parts){
   groups[part.kind].forEach((vehicle,i)=>{
    const {sample}=vehicle,visible=!!sample&&part.filter(vehicle);
    if(sample){
     const angle=sample.angle-Math.PI/2,c=Math.cos(angle),s=Math.sin(angle),[x,y,z]=part.position;
     this.dummy.position.set(sample.point[0]+x*c-y*s,sample.point[1]+x*s+y*c,(part.anchor==='ground'?vehicle.ground:sample.point[2])+z);this.dummy.rotation.set(0,0,angle);
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
