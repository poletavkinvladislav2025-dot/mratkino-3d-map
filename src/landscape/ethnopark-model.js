import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ethnopark as config} from './ethnopark-settings.js';
import {makeHerd,advanceHerd} from './deer-motion.js';
export class EthnoparkModel{
 constructor(scene,height,{config:settings=config}={}){this.config=settings;this.height=height;this.group=new T.Group();scene.add(this.group);this.resources=new Set();this.herd=makeHerd(settings);this.elapsed=0;this.create();}
 material(color){const m=new T.MeshLambertMaterial({color,flatShading:true});this.resources.add(m);return m;}
 mesh(g,m){this.resources.add(g);const o=new T.Mesh(g,m);this.group.add(o);return o;}
 rod(a,b,r=.1){const d=new T.Vector3().subVectors(b,a),g=new T.CylinderGeometry(r,r,d.length(),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());return g;}
 create(){const c=this.config,{width:w,depth:d,postSpacing:spacing,height:fh}=c.pen,wood=this.material(0x8c7656),poles=[],rails=[];const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]];
  for(let side=0;side<4;side++){const a=corners[side],b=corners[side+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/spacing);for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=this.height(x,y);poles.push(this.rod(new T.Vector3(x,y,z),new T.Vector3(x,y,z+fh+(i%3)*.05),.13));if(i<n){const xx=a[0]+(b[0]-a[0])*(i+1)/n,yy=a[1]+(b[1]-a[1])*(i+1)/n,zz=this.height(xx,yy);for(const h of [.48,.98,1.45])rails.push(this.rod(new T.Vector3(x,y,z+h),new T.Vector3(xx,yy,zz+h),.075));}}}
  // Closed gate panel is visually distinct; the pen remains closed to the herd.
  for(const list of [poles,rails]){const g=mergeGeometries(list);list.forEach(x=>x.dispose());this.mesh(g,wood);}
  const {x,y,radius:r,height:h}=c.chum,z=this.height(x,y),chum=this.mesh(new T.ConeGeometry(r,h,32,1,true).rotateX(Math.PI/2),this.material(0x737d69));chum.position.set(x,y,z+h/2);
  const base=this.mesh(new T.CylinderGeometry(r,r,.3,32).rotateX(Math.PI/2),this.material(0xb1aca0));base.position.set(x,y,z+.05);
  const seams=[];for(let i=0;i<16;i++){const a=i*Math.PI/8;seams.push(this.rod(new T.Vector3(x+Math.cos(a)*r,y+Math.sin(a)*r,z+.15),new T.Vector3(x,y,z+h),.022));}const sg=mergeGeometries(seams);seams.forEach(g=>g.dispose());this.mesh(sg,this.material(0x505e4e));
  const pipe=this.mesh(new T.CylinderGeometry(.17,.17,c.chum.chimneyHeight,8).rotateX(Math.PI/2),this.material(0x828b8a));pipe.position.set(x+.35,y,z+h+c.chum.chimneyHeight/2-.5);
  const entrance=this.mesh(new T.PlaneGeometry(1.5,2.3).rotateX(Math.PI/2).rotateX(Math.PI/2),this.material(0x384137));entrance.material.side=T.DoubleSide;const ea=c.chum.entranceBearing*Math.PI/180;entrance.position.set(x+Math.sin(ea)*(r-.7),y+Math.cos(ea)*(r-.7),z+1.1);entrance.rotation.set(Math.PI/2,0,-ea);
  const gate=this.mesh(new T.BoxGeometry(c.pen.gateWidth,.18,.9),this.material(0x665239));gate.position.set(0,-d/2-.12,this.height(0,-d/2)+.8);
  this.makeDeer();this.update(0);
 }
 makeDeer(){this.parts=[];const light=this.material(0xffffff),dark=this.material(0x514b44),horn=this.material(0xa79b80),n=this.herd.length;
  const part=(g,m,position,scale,kind='body',index=0)=>{this.resources.add(g);const mesh=new T.InstancedMesh(g,m,n);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.group.add(mesh);this.parts.push({mesh,position,scale,kind,index});return mesh;};
  const sphere=()=>new T.IcosahedronGeometry(1,1),body=part(sphere(),light,[0,0,1.35],[1.05,.38,.48]);
  const neck=part(sphere(),light,[.72,0,1.8],[.3,.25,.65],'head');part(sphere(),dark,[1.0,0,2.17],[.39,.20,.25],'head');part(sphere(),dark,[1.27,0,2.05],[.26,.18,.16],'head');
  for(const y of [-.23,.23])part(sphere(),dark,[.91,y,2.36],[.22,.075,.12],'head');
  for(let i=0;i<4;i++)part(new T.CylinderGeometry(.065,.08,1.13,5).rotateX(Math.PI/2),dark,[i<2?-.65:.65,i%2?.25:-.25,.59],[1,1,1],'leg',i);
  const hornPieces=[];for(const side of [-1,1]){const p=[new T.Vector3(.84,side*.12,2.32),new T.Vector3(.68,side*.28,2.76),new T.Vector3(.36,side*.44,3.1),new T.Vector3(.05,side*.55,3.25)];for(let i=1;i<p.length;i++){hornPieces.push(this.rod(p[i-1],p[i],.038));hornPieces.push(this.rod(p[i],new T.Vector3(p[i].x+.22,p[i].y+side*.12,p[i].z+.23),.026));}}const antlers=mergeGeometries(hornPieces);hornPieces.forEach(g=>g.dispose());antlers.translate(-.72,0,-2.2);part(antlers,horn,[.72,0,2.2],[1,1,1],'antlers');
  const palette=[0xc8c3b7,0xbbb3a4,0x9f9586,0xd5cfc0,0xb5ad9e];for(let i=0;i<n;i++){body.setColorAt(i,new T.Color(palette[i%5]));neck.setColorAt(i,new T.Color(palette[(i+1)%5]));}
  this.dummy=new T.Object3D();this.q=new T.Quaternion();this.rot=new T.Quaternion();
 }
 update(dt){this.elapsed+=dt;if(dt)advanceHerd(this.herd,dt,this.config);
  const bases=this.herd.map(a=>this.height(a.x,a.y));for(const p of this.parts){for(let i=0;i<this.herd.length;i++){const a=this.herd[i],size=.87+(i%5)*.055,head=a.mode==='graze'?1.3:Math.sin(a.clock*.6+a.id)*.08,headYaw=Math.sin(a.clock*.45+a.id)*.3,local=new T.Vector3(...p.position);let swing=0;
    if(p.kind==='leg'){swing=a.moving?Math.sin(a.phase+(p.index===0||p.index===3?0:Math.PI))*.48:0;local.x+=Math.sin(swing)*.43;local.z+=1-Math.cos(swing);}
    if(p.kind==='head'||p.kind==='antlers'){local.sub(new T.Vector3(.55,0,1.0)).applyAxisAngle(new T.Vector3(0,1,0),head).applyAxisAngle(new T.Vector3(0,0,1),headYaw).add(new T.Vector3(.55,0,1.0));}
    local.multiplyScalar(size).applyAxisAngle(new T.Vector3(0,0,1),a.heading);this.dummy.position.set(a.x+local.x,a.y+local.y,bases[i]+local.z);
    this.dummy.rotation.set(0,p.kind==='leg'?swing:p.kind==='head'||p.kind==='antlers'?head:0,a.heading+(['head','antlers'].includes(p.kind)?headYaw:0),'ZYX');this.dummy.scale.set(...p.scale.map(v=>v*size*(p.kind==='antlers'&&i%4===0?0:1)));this.dummy.updateMatrix();p.mesh.setMatrixAt(i,this.dummy.matrix);
   }p.mesh.instanceMatrix.needsUpdate=true;}
 }
 dispose(){this.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});this.resources.forEach(r=>r.dispose());this.group.removeFromParent();}
}
