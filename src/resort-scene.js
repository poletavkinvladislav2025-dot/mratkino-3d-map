import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ACTIVE_RIDER_TRAILS,ridersPerTrail,riderProfile,localRiderAreas,riderAreasForTrail,insideRiderArea,buildRiderCorridor,advanceCrowd} from './rider-motion.js';
import { SUMMIT } from './map-data.js';
import { saplingPlacements, forestLOD, treeAppearance, liftVehicle, toLocal, toLngLat, pathLength, samplePath, liftLoop } from './resort-scene-data.js';

/** Opt-in, procedural 3D illustration. No external models, textures or live-status claims. */
export class ResortScene {
 constructor(map,ml,data,{mobile=false,forestInstances,onStats=()=>{},profile={}}={}){
  this.profile=profile;this.project=profile.toLocal||toLocal;this.unproject=profile.toLngLat||toLngLat;
  this.id=profile.id||'resort-life';this.type='custom';this.renderingMode='3d';
  this.map=map;this.ml=ml;this.data=data;this.mobile=mobile;this.onStats=onStats;
  this.enabled=true;this.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.forestVisible=true;this.liftsVisible=true;this.elapsed=0;this.lastTime=null;this.disposed=false;
  this.origin=ml.MercatorCoordinate.fromLngLat(profile.center||SUMMIT,0);this.units=this.origin.meterInMercatorCoordinateUnits();
  this.resources=new Set();this.forestInstances=forestInstances;this.saplings=profile.forest===false||profile.saplings===false?[]:saplingPlacements(data);
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
  this.forest=new THREE.Group();this.vehicles=new THREE.Group();this.riders=new THREE.Group();this.scene.add(this.forest,this.vehicles,this.riders);
  this.makeTrees();this.makeLifts();this.makeRiders();this.refreshTerrain();
  this.visibility=()=>{this.lastTime=null;this.schedule();};document.addEventListener('visibilitychange',this.visibility);
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.motionChange=()=>{if(this.motion.matches)this.setPaused(true);};this.motion.addEventListener('change',this.motionChange);
  this.onMove=()=>this.refreshTerrain();map.on('moveend',this.onMove);
  this.onSource=e=>{if(e.sourceId==='dem'&&e.isSourceLoaded&&!this.terrainTimer)this.terrainTimer=setTimeout(()=>{this.terrainTimer=null;if(!this.disposed)this.refreshTerrain();},200);};map.on('sourcedata',this.onSource);
  this.inViewport=true;this.viewportObserver=new IntersectionObserver(entries=>{this.inViewport=entries[0]?.isIntersecting;this.lastTime=null;this.schedule();if(this.inViewport)this.map.triggerRepaint();});this.viewportObserver.observe(map.getContainer());
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
  if(this.profile.forest===false)return;
  // Layered, tapered conifer profile: pointed tiers instead of round broadleaf crowns.
  const profile=[new THREE.Vector2(0,-.5),new THREE.Vector2(.92,-.44),new THREE.Vector2(.57,-.29),new THREE.Vector2(1,-.27),new THREE.Vector2(.52,-.08),new THREE.Vector2(.8,-.06),new THREE.Vector2(.36,.14),new THREE.Vector2(.55,.16),new THREE.Vector2(.2,.34),new THREE.Vector2(.3,.35),new THREE.Vector2(0,.5)];
  const silhouettes=[[-.32,.1,1],[.32,-.12,.9]].map(([x,y,h])=>new THREE.ConeGeometry(.56,h,5).rotateX(Math.PI/2).translate(x,y,(h-1)/2));
  const crown=this.geometry(mergeGeometries(silhouettes));silhouettes.forEach(g=>g.dispose());
  const nearCrown=this.geometry(new THREE.LatheGeometry(profile,6).rotateX(Math.PI/2));
  const cone=this.geometry(new THREE.ConeGeometry(1,1,7).rotateX(Math.PI/2));
  const trunk=this.geometry(new THREE.CylinderGeometry(.7,1,1,5).rotateX(Math.PI/2));
  this.nearCapacity=this.mobile?1800:4000;
  this.farCapacity=Math.ceil(this.forestInstances.count/(this.mobile?8:4)*1.2);
  this.trunks=this.batch(trunk,this.material(0x94705b),this.nearCapacity,this.forest);
  this.nearCrowns=[0].map(()=>this.batch(nearCrown,this.material(0xffffff,false),this.nearCapacity,this.forest));
  this.farTrunks=this.batch(new THREE.CylinderGeometry(.7,1,1,3).rotateX(Math.PI/2),this.material(0x796a55),this.farCapacity,this.forest);
  this.farCrowns=this.batch(crown,this.material(0xffffff),this.farCapacity,this.forest);
  this.palette=[0x3b5845,0x476349,0x526c4a,0x405c4c].map(color=>new THREE.Color(color));
  this.saplingTrunks=this.batch(trunk,this.material(0x79624e),this.saplings.length,this.forest);
  this.saplingTiers=[0,1,2].map((_,i)=>this.batch(cone,this.material([0x315b4c,0x3e6b56,0x507e65][i]),this.saplings.length,this.forest));
 }
 refreshForest(){
  if(this.profile.forest===false)return;
  const pool=this.forestInstances,lod=forestLOD(pool,this.map.getCenter().toArray(),{mobile:this.mobile,zoom:this.map.getZoom(),bounds:this.map.getBounds().toArray(),project:this.project});
  const near=lod.near.slice(0,this.nearCapacity),far=lod.far.slice(0,this.farCapacity);
  const put=(mesh,i,x,y,z,rotation,sx,sy,sz)=>{this.dummy.position.set(x,y,z);this.dummy.rotation.set(0,0,rotation);this.dummy.scale.set(sx,sy,sz);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);};
  near.forEach((id,i)=>{
   const [x,y,base]=pool.positions.subarray(id*3,id*3+3),ll=this.unproject([x,y]),[mx,my]=this.local(ll);
   const z=this.height(ll)??base,{height:h,radius:r,rotation}=treeAppearance(pool.seeds[id]);
   put(this.trunks,i,mx,my,z+h*.28,rotation,.27+h*.004,.27+h*.004,h*.56);
   put(this.nearCrowns[0],i,mx,my,z+h*.72,rotation,r,r*.84,h*.56);
   for(const mesh of this.nearCrowns)mesh.setColorAt(i,this.palette[(pool.seeds[id]>>>3)%this.palette.length]);
  });
  far.forEach((id,i)=>{
   const [x,y,z]=pool.positions.subarray(id*3,id*3+3),[mx,my]=this.local(this.unproject([x,y]));
   const {height:h,radius:r,rotation}=treeAppearance(pool.seeds[id]),cluster=.92;
   // Sparse pointed silhouettes above the continuous forest surface; full tiered pines nearby.
   put(this.farTrunks,i,mx,my,z+h*.24,rotation,.4,.4,h*.48);
   put(this.farCrowns,i,mx,my,z+h*.68,rotation,r*cluster,r*cluster*.85,h*.64);
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
   this.routes.push({feature,chair,seats:this.profile.seatsFromSource?feature.properties.seats||1:3,animate:feature.properties.animate!==false,count:this.mobile?(chair?12:6):(chair?24:10),points:[],length:0});
  }
  this.stats.lifts=this.routes.length;
  this.parts=[];const box=this.geometry(new THREE.BoxGeometry(1,1,1)),sphere=this.geometry(new THREE.SphereGeometry(1,6,4));
  const steel=this.material(0x686d78),seat=this.material(0xc88a54),clothes=this.material(0x326f87),red=this.material(0xb95b46),skin=this.material(0xf1ceb0),skis=this.material(0x3e4651);
  const add=(kind,geometry,material,position,scale,filter=()=>true,anchor='cable')=>{
   const count=this.routes.filter(r=>r.chair===(kind==='chair')).reduce((n,r)=>n+r.count,0);
   this.parts.push({kind,position,scale,filter,anchor,mesh:this.batch(geometry,material,count,this.vehicles)});
  };
  // Open bench, back, hangers and safety rail; capacity follows the resort profile.
  add('chair',box,steel,[0,0,-1.3],[.07,.07,2.6]);
  add('chair',box,seat,[0,0,-2.65],v=>[v.seats*.7+.05,.6,.16]);
  add('chair',box,seat,[0,-.27,-2.28],v=>[v.seats*.7+.05,.1,.65]);
  for(const sign of [-1,1])add('chair',box,steel,v=>[sign*((v.seats*.7+.05)/2-.055),0,-2.25],[.06,.65,.8]);
  add('chair',box,steel,[0,.32,-2.1],v=>[v.seats*.7+.05,.06,.06]);
  const maxSeats=Math.max(1,...this.routes.filter(r=>r.chair).map(r=>r.seats));
  for(let index=0;index<maxSeats;index++){
   const occupied=vehicle=>vehicle.ascending&&vehicle.active&&vehicle.index%3!==1&&index<vehicle.seats;
   const x=v=>(index-(v.seats-1)/2)*.7;
   add('chair',box,index===1?red:clothes,v=>[x(v),0,-2.22],[.38,.32,.55],occupied);
   add('chair',sphere,skin,v=>[x(v),0,-1.78],[.19,.19,.2],occupied);
   for(const dx of [-.11,.11]){
    add('chair',box,skis,v=>[x(v)+dx,.18,-2.98],[.1,.14,.65],occupied);
    add('chair',box,skis,v=>[x(v)+dx,.4,-3.32],[.08,1.5,.045],occupied);
   }
  }
  // Single-person platter: stem + disc, with skis on the snow on the uphill branch.
  const disc=this.geometry(new THREE.CylinderGeometry(.21,.21,.06,10).rotateX(Math.PI/2));
  add('drag',box,steel,[0,0,-1.15],[.045,.045,2.3]);
  add('drag',disc,steel,[0,0,-2.3],[1,1,1]);
  const riding=v=>v.ascending&&v.active&&v.index%3!==1;
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
   const flat=coordinates.map(this.project),length=pathLength(flat),line=[];
   for(let d=0;d<length;d+=18){const ll=this.unproject(samplePath(flat,d).point),z=this.height(ll);if(z===null)continue;const [x,y]=this.local(ll);line.push([x,y,z+(route.chair?7:3.1)]);}
   const end=coordinates.at(-1),[x,y]=this.local(end);line.push([x,y,this.height(end)+(route.chair?7:3.1)]);
   if(line.length<2)continue;
   route.ascentLength=pathLength(line);route.points=liftLoop(line,route.chair?2.2:1);route.length=pathLength(route.points);
   if(route.cable){route.cable.geometry.dispose();route.cable.geometry=new THREE.BufferGeometry().setFromPoints(route.points.map(p=>new THREE.Vector3(...p)));route.cable.visible=true;}
   else {route.cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.points.map(p=>new THREE.Vector3(...p))),this.cableMaterial);this.vehicles.add(route.cable);}
  }
  this.refreshRiderPaths();this.updateVehicles();this.updateRiders();this.onStats({...this.stats});this.map.triggerRepaint();
 }
 updateVehicles(){
  const groups={chair:[],drag:[]};
  for(const route of this.routes)for(let index=0;index<route.count;index++){
   const vehicle=liftVehicle(route,index,route.animate?this.elapsed:0);vehicle.seats=route.seats;vehicle.active=route.animate;vehicle.routeId=route.feature.properties.id;
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
     const angle=sample.angle-Math.PI/2,c=Math.cos(angle),s=Math.sin(angle),[x,y,z]=typeof part.position==='function'?part.position(vehicle):part.position;
     this.dummy.position.set(sample.point[0]+x*c-y*s,sample.point[1]+x*s+y*c,(part.anchor==='ground'?vehicle.ground:sample.point[2])+z);this.dummy.rotation.set(0,0,angle);
    }
    const scale=typeof part.scale==='function'?part.scale(vehicle):part.scale;this.dummy.scale.set(...scale.map(v=>visible?v:0));this.dummy.updateMatrix();part.mesh.setMatrixAt(i,this.dummy.matrix);
   });part.mesh.instanceMatrix.needsUpdate=true;
  }
 }
 makeRiders(){
  this.riderAreas=localRiderAreas(this.data.riderAreas?.features||this.data.trails.features,this.project);
  this.riderBoardPose=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);this.riderQuaternion=new THREE.Quaternion();this.riderBodyQuaternion=new THREE.Quaternion();this.riderOffset=new THREE.Vector3();this.riderEuler=new THREE.Euler();
  this.riderRoutes=this.data.trails.features.filter(f=>f.geometry.type==='LineString'&&(this.profile.riderAreasById||this.profile.centerlineOnly||ACTIVE_RIDER_TRAILS.has(f.properties.name))).map(feature=>({feature,areas:this.profile.riderAreasById?this.riderAreas.filter(a=>a.trailId===feature.properties.id):riderAreasForTrail(this.riderAreas,feature.properties.name),points:[],length:0,count:this.profile.ridersPerSegment?.[this.mobile?'mobile':'desktop']??ridersPerTrail(this.mobile)}));
  this.riderProfiles=this.riderRoutes.flatMap((r,ri)=>Array.from({length:r.count},(_,i)=>riderProfile(ri,i,r.feature.properties.name)));
  let pi=0;this.riderAgents=this.riderRoutes.flatMap(route=>Array.from({length:route.count},(_,index)=>({route,index,profile:this.riderProfiles[pi++],distance:0,active:false})));
  const buildings=this.data.facilities.features.filter(f=>f.properties.tags?.building||f.properties.kind==='building');this.riderBuildings=localRiderAreas(buildings,this.project);
  this.riderStations=this.data.stations.features.filter(f=>f.geometry.type==='Point').map(f=>this.project(f.geometry.coordinates));
  this.riderClosedAreas=this.riderAreas.filter(a=>a.id==='relation/12615529');
  this.riderBlocked=point=>insideRiderArea(point,this.riderBuildings)||insideRiderArea(point,this.riderClosedAreas)||this.riderStations.some(p=>Math.hypot(point[0]-p[0],point[1]-p[1])<6)||(this.profile.radiusM&&Math.hypot(...point)>this.profile.radiusM-2);
  this.riderCount=this.riderRoutes.reduce((n,r)=>n+r.count,0);this.riderParts=[];
  const box=new THREE.BoxGeometry(1,1,1),head=new THREE.SphereGeometry(1,6,4);
  const jacket=this.material(0xffffff),warm=this.material(0xb86849),dark=this.material(0x33434b),helmet=this.material(0xe7dfcb);
  const add=(geometry,material,position,scale,kind='all')=>this.riderParts.push({position,scale,kind,mesh:this.batch(geometry,material,this.riderCount,this.riders)});
  add(box,jacket,[0,0,1.08],[.4,.3,.58]);add(head,helmet,[0,0,1.52],[.19,.19,.21]);
  for(const side of [-1,1]){add(box,dark,[side*.11,0,.52],[.15,.19,.65]);add(box,warm,[side*.29,.08,1.05],[.13,.4,.15]);add(box,dark,[side*.12,.22,.12],[.09,1.7,.045],'ski');}
  add(box,dark,[0,0,.12],[.28,1.25,.065],'board');
  const palette=[0x467a89,0xaf694f,0x5e6d89,0x67816b,0xbc995c,0x805e70].map(c=>new THREE.Color(c));
  const torso=this.riderParts[0].mesh;this.riderProfiles.forEach((p,i)=>torso.setColorAt(i,palette[p.color]));
  this.stats.riders=this.riderCount;this.stats.snowboarders=this.riderProfiles.filter(p=>p.board).length;
 }
 refreshRiderPaths(){
  for(const route of this.riderRoutes){
   let coords=route.feature.geometry.coordinates;const a=this.height(coords[0]),b=this.height(coords.at(-1));
   if(a===null||b===null){route.length=0;route.points=[];continue;}
   if(a<b)coords=[...coords].reverse();
   const flat=coords.map(this.project),length=pathLength(flat),points=[];
   const reversed=a<b;if(!route.corridor||route.reversed!==reversed){route.corridor=buildRiderCorridor(flat,route.areas,{centerlineOnly:!!this.profile.centerlineOnly,maxHalfWidth:Math.min(...route.areas.map(a=>a.maxHalfWidthM??Infinity))});route.reversed=reversed;}
   for(let d=0;d<length;d+=12){const ll=this.unproject(samplePath(flat,d).point),z=this.height(ll);if(z===null)continue;const [x,y]=this.local(ll);points.push([x,y,z+.05]);}
   const last=coords.at(-1),z=this.height(last),[x,y]=this.local(last);if(z!==null)points.push([x,y,z+.05]);
   route.points=points;route.length=points.length>1?route.corridor.length:0;
  }
 }
 updateRiders(){
  const dt=this.lastRiderElapsed===undefined?0:Math.min(.15,Math.max(0,this.elapsed-this.lastRiderElapsed));this.lastRiderElapsed=this.elapsed;
  let initial=false;
  for(const agent of this.riderAgents)if(agent.corridor!==(agent.route.length?agent.route.corridor:null)){agent.corridor=agent.route.length?agent.route.corridor:null;agent.distance=(agent.index+.37)/agent.route.count*agent.route.length;agent.active=false;initial=true;}
  const states=advanceCrowd(this.riderAgents,dt,{initial,blocked:this.riderBlocked}),people=[];
  const bounds=this.map.getBounds(),west=bounds.getWest(),east=bounds.getEast(),south=bounds.getSouth(),north=bounds.getNorth();
  for(const [personIndex,agent] of this.riderAgents.entries()){
   const profile=agent.profile,state=states[personIndex];
   if(state){
    const ll=this.unproject(state.point),onScreen=ll[0]>=west&&ll[0]<=east&&ll[1]>=south&&ll[1]<=north;
    const z=onScreen&&state.inside&&state.clear?this.height(ll):null;
    state.visible=z!==null&&state.fade>0;
    if(state.visible){const [x,y]=this.local(ll);state.position=[x,y,z+.04];}
   }
   people.push({state,profile});
  }
  this.riderStates=people;this.stats.visibleRiders=people.filter(p=>p.state?.visible).length;
  // Lean the whole body about the contact point, with the board following the actual S-curve.
  for(const part of this.riderParts){people.forEach(({state,profile},i)=>{
   const visible=state?.visible&&(part.kind==='all'||(part.kind==='board')===profile.board);
   if(visible){
    const angle=state.heading-Math.PI/2;
    this.riderQuaternion.setFromEuler(this.riderEuler.set(0,state.lean,angle,'ZYX'));
    this.riderBodyQuaternion.copy(this.riderQuaternion);
    if(profile.board&&part.kind==='all')this.riderBodyQuaternion.multiply(this.riderBoardPose);
    const orientation=profile.board&&part.kind==='all'?this.riderBodyQuaternion:this.riderQuaternion;
    this.riderOffset.set(...part.position).applyQuaternion(orientation);
    this.dummy.position.set(state.position[0]+this.riderOffset.x,state.position[1]+this.riderOffset.y,state.position[2]+this.riderOffset.z);
    this.dummy.quaternion.copy(orientation);
   }
   this.dummy.scale.set(...part.scale.map(v=>visible?v*state.fade:0));this.dummy.updateMatrix();part.mesh.setMatrixAt(i,this.dummy.matrix);
  });part.mesh.instanceMatrix.needsUpdate=true;}
 }
 setEnabled(value){this.enabled=value;this.lastTime=null;this.schedule();this.map.triggerRepaint();}
 setPaused(value){this.paused=value;this.lastTime=null;this.schedule();this.onStats({...this.stats,paused:value});}
 setLayers({forest,lifts}){this.forestVisible=forest;this.liftsVisible=lifts;this.schedule();this.map.triggerRepaint();}
 schedule(){
  clearTimeout(this.timer);this.timer=null;
  if(this.disposed||!this.enabled||this.paused||document.hidden||!this.inViewport)return;
  this.timer=setTimeout(()=>{this.timer=null;if(!this.disposed)this.map.triggerRepaint();},this.frameInterval||1000/(this.mobile?18:24));
 }
 render(gl,args){
  if(this.disposed||!this.enabled||!this.inViewport)return;
  const now=performance.now();
  if(!this.paused&&!document.hidden){if(this.lastTime!==null)this.elapsed+=Math.min((now-this.lastTime)/1000,.15);this.lastTime=now;this.updateVehicles();if(this.map.getZoom()>=14.3)this.updateRiders();else this.stats.visibleRiders=0;}
  else this.lastTime=null;
  this.forest.visible=this.forestVisible&&this.map.getZoom()>=(this.profile.forestMinZoom??13.5);
  this.vehicles.visible=this.liftsVisible;this.riders.visible=this.map.getZoom()>=14.3;
  this.camera.projectionMatrix.copy(this.matrix.fromArray(args.defaultProjectionData.mainMatrix)).multiply(this.transform);
  this.renderer.resetState();this.renderer.setViewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);this.renderer.render(this.scene,this.camera);this.renderer.resetState();
  this.frameInterval=Math.max(1000/(this.mobile?18:24),Math.min(500,(performance.now()-now)*2));
  this.stats.frames++;this.stats.elapsed=this.elapsed;this.schedule();
 }
 onRemove(){
  if(this.disposed)return;
  this.disposed=true;clearTimeout(this.timer);clearTimeout(this.terrainTimer);this.timer=null;this.terrainTimer=null;
  this.viewportObserver?.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.motion?.removeEventListener('change',this.motionChange);
  this.map.off('moveend',this.onMove);this.map.off('sourcedata',this.onSource);
  const geometries=new Set();this.scene?.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.isInstancedMesh)object.dispose();});
  geometries.forEach(g=>g.dispose());this.resources.forEach(r=>r.dispose());this.renderer?.dispose();
 }
}
