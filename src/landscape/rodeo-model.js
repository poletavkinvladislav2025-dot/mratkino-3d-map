import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from 'three';
import {rodeoPlan,freestylePose,sampledRodeoGround,freestyleAltitude} from './rodeo-plan.js';
/** Procedural freestyle illustration, rendered inside the existing landscape layer. */
export class RodeoModel{
 constructor(scene,height,{mobile=false}={}){
  this.group=new T.Group();scene.add(this.group);this.plan=rodeoPlan(height);this.height=sampledRodeoGround(this.plan,height);this.resources=new Set();this.elapsed=0;this.count=mobile?48:96;this.poses=[];this.dummy=new T.Object3D();this.quaternion=new T.Quaternion();this.offset=new T.Vector3();this.euler=new T.Euler();this.parts=[];this.makeGround();this.makeFeatures();this.mergeStatic();this.makeRiders();this.update(0);
 }
 material(color){const m=new T.MeshLambertMaterial({color,flatShading:true,side:T.DoubleSide});this.resources.add(m);return m;}
 mesh(g,color){this.resources.add(g);const m=new T.Mesh(g,this.material(color));this.group.add(m);return m;}
 box(x,d,w,len,h,color,z=0){const p=this.plan.point(x,d),m=this.mesh(new T.BoxGeometry(w,len,h),color);m.position.set(...p,this.height(...p)+h/2+z);m.rotation.z=this.plan.angle;return m;}
 makeGround(){
  const vertices=[],p=this.plan;for(let d=0;d<p.length;d+=8)for(let x=-43;x<43;x+=6){const end=Math.min(p.length,d+8),xx=Math.min(43,x+6),a=p.point(x,d),b=p.point(xx,d),c=p.point(xx,end),e=p.point(x,end);for(const q of [a,b,c,a,c,e])vertices.push(...q,this.height(...q)+.2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();const m=this.mesh(g,0xf1f5f4);m.material.side=T.DoubleSide;
 }
 ramp(x,d,w,len,h){
  const a=[-w/2,-len/2,0],b=[w/2,-len/2,0],c=[w/2,len/2,0],e=[-w/2,len/2,0],f=[-w/2,len/2,h],g=[w/2,len/2,h],v=[];for(const q of [a,b,g,a,g,f,b,c,g,e,f,g,e,g,c,a,f,e])v.push(...q);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(v,3));geometry.computeVertexNormals();const m=this.mesh(geometry,0xe8f2f6),p=this.plan.point(x,d);m.position.set(...p,this.height(...p)+.2);m.rotation.z=this.plan.angle;m.material.side=T.DoubleSide;return m;
 }
 makeFeatures(){
  const p=this.plan,b=p.bag,xy=p.point(b.x,b.d);this.box(b.x,b.d,b.width,b.length,1.8,0x176896);
  const pillow=this.mesh(new T.SphereGeometry(1,16,8),0x28a4cc);pillow.position.set(...xy,this.height(...xy)+1.4);pillow.scale.set(11,8,2.8);pillow.rotation.z=p.angle;
  const seams=[];for(let x=-8;x<=8;x+=4){const limit=8*Math.sqrt(1-(x/11)**2)*.95;for(let y=-limit;y<limit;y+=1){const end=Math.min(limit,y+1);for(const [xx,yy] of [[x-.08,y],[x+.08,y],[x+.08,end],[x-.08,y],[x+.08,end],[x-.08,end]])seams.push(xx,yy,1.4+2.8*Math.sqrt(Math.max(0,1-(xx/11)**2-(yy/8)**2))+.06);}}
  const seamGeometry=new T.BufferGeometry();seamGeometry.setAttribute('position',new T.Float32BufferAttribute(seams,3));seamGeometry.computeVertexNormals();const fabric=this.mesh(seamGeometry,0xd5f1fa);fabric.position.set(...xy,this.height(...xy));fabric.rotation.z=p.angle;
  this.ramp(b.x,b.d-26,5,8,3.1);this.ramp(b.x,b.d+11,20,6,1.8).rotation.z+=Math.PI;
  for(let lane=1;lane<6;lane++){
   const x=p.lanes[lane],jump=p.length*(lane%2?.43:.6);this.ramp(x,jump-4,4,7,2.2);
   const d=p.length*.23+lane%2*13;if(lane%2){this.box(x,d,1.4,10,.8,0x327c98);this.box(x,d,1.5,10,.08,0x25313a,.8);}else{this.box(x,d,.16,10,1.15,0x475461);for(const off of [-4,4])this.box(x,d+off,.2,.2,.9,0x475461);}
   this.ramp(x,p.length*.91,4.5,6,1.2);
  }
  // Visible edge markers frame the artistic clearing without becoming geographic route data.
  for(let d=10;d<p.length;d+=22)for(const x of [-42,42])this.box(x,d,.24,.24,1.6,0xe46837);
  this.features={airbags:1,kickers:11,boxes:3,rails:2};
 }
 mergeStatic(){
  const buckets=new Map();for(const mesh of [...this.group.children]){if(!mesh.isMesh||mesh.isInstancedMesh)continue;mesh.updateMatrix();const key=mesh.material.color.getHex()+':'+mesh.material.side+':'+Object.keys(mesh.geometry.attributes).sort().join(','),bucket=buckets.get(key)||{material:mesh.material,geometries:[]};bucket.geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrix));buckets.set(key,bucket);mesh.removeFromParent();mesh.geometry.dispose();this.resources.delete(mesh.geometry);}
  for(const {material,geometries} of buckets.values()){const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)throw Error('Freestyle geometry merge');this.resources.add(geometry);this.group.add(new T.Mesh(geometry,material));}
 }
 makeRiders(){
  const box=new T.BoxGeometry(1,1,1),head=new T.SphereGeometry(1,6,4);this.resources.add(box);this.resources.add(head);
  const add=(g,color,pos,scale,kind='all')=>{const m=new T.InstancedMesh(g,this.material(color),this.count);m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);this.group.add(m);this.parts.push({mesh:m,pos,scale,kind});};
  add(box,0xffffff,[0,0,1.1],[.47,.34,.65]);add(head,0xf4e8d4,[0,0,1.65],[.22,.22,.23]);add(box,0x273d54,[0,.17,1.68],[.34,.16,.12]);
  for(const s of [-1,1]){add(box,0x344351,[s*.12,0,.55],[.17,.23,.7]);add(box,0x3d5266,[s*.34,.05,1.1],[.15,.43,.17]);add(box,0xf9cf57,[s*.15,0,.09],[.12,1.9,.07],'ski');}
  add(box,0xeb7a3b,[0,0,.1],[.37,1.6,.09],'board');
  const palette=[0xf18a35,0x286cb8,0xe4415d,0x7e53a4,0x34a893,0xe4bd35];for(let i=0;i<this.count;i++)this.parts[0].mesh.setColorAt(i,new T.Color(palette[i%6]));
 }
 terrain(x,y){return this.height(x,y);}
 update(dt){
  this.elapsed+=dt;const p=this.plan;this.poses=Array.from({length:this.count},(_,i)=>freestylePose(p,i,this.elapsed,this.count));
  for(const part of this.parts){for(let i=0;i<this.count;i++){
   const state=this.poses[i],z=freestyleAltitude(p,state,this.height);
   this.quaternion.setFromEuler(this.euler.set(state.flip,state.lean,state.heading+state.spin+(state.board&&part.kind==='all'?Math.PI/2:0),'ZYX'));
   this.offset.set(...part.pos).applyQuaternion(this.quaternion);this.dummy.position.set(state.x+this.offset.x,state.y+this.offset.y,z+this.offset.z);this.dummy.quaternion.copy(this.quaternion);
   const visible=part.kind==='all'||(state.board?part.kind==='board':part.kind==='ski');this.dummy.scale.set(...part.scale.map(v=>visible?v*state.fade:0));this.dummy.updateMatrix();part.mesh.setMatrixAt(i,this.dummy.matrix);
  }part.mesh.instanceMatrix.needsUpdate=true;}
 }
 dispose(){this.group.removeFromParent();this.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)this.resources.add(o.geometry);});this.resources.forEach(r=>r.dispose());this.resources.clear();}
}
