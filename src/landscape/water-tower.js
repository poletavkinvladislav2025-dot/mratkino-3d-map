import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Existing owner-supplied point. Dimensions are an illustration from the card photo,
// not an architectural survey. Z is up; coordinates and passport records stay intact.
import {WATER_TOWER} from './water-tower-settings.js';
export {WATER_TOWER};
const OCT=Math.PI/4;
function brickTexture(){
 const n=128,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const row=Math.floor(y/16),xx=(x+(row%2)*32)%64,mortar=y%16<2||xx<2,noise=((x*17+y*43)%13)-6,i=(y*n+x)*4;
  const c=mortar?[135,110,93]:[178+noise,91+noise,60+noise];data.set([...c,255],i);
 }
 const texture=new T.DataTexture(data,n,n);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(24,9);texture.needsUpdate=true;return texture;
}
function woodTexture(){
 const n=128,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const seam=y%16<2,v=seam?-35:((x*7+Math.floor(y/3)*11)%9)-4,i=(y*n+x)*4;data.set([178+v,111+v,53+v,255],i);}
 const t=new T.DataTexture(data,n,n);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,3);t.needsUpdate=true;return t;
}
export class WaterTowerModel{
 constructor(scene){this.group=new T.Group();this.group.name='beloretsk-water-tower';this.resources=new Set();this.batches=new Map();this.create();scene.add(this.group);}
 material(color,extra={}){const m=new T.MeshLambertMaterial({color,side:T.DoubleSide,flatShading:true,...extra});this.resources.add(m);return m;}
 add(g,m){if(g.index){const n=g.toNonIndexed();g.dispose();g=n;}if(!this.batches.has(m))this.batches.set(m,[]);this.batches.get(m).push(g);}
 box(x,y,z,w,d,h,m,angle=0){this.add(new T.BoxGeometry(w,d,h).rotateZ(angle).translate(x,y,z),m);}
 octagon(radius,height,z,m,top=radius){this.add(new T.CylinderGeometry(top,radius,height,8).rotateX(Math.PI/2).rotateZ(-Math.PI/8).translate(0,0,z+height/2),m);}
 face(g,angle,radius,z,m){g.rotateX(Math.PI/2).translate(0,-radius,z).rotateZ(angle);this.add(g,m);}
 rod(a,b,r,m){const start=new T.Vector3(...a),end=new T.Vector3(...b),v=end.clone().sub(start),g=new T.CylinderGeometry(r,r,v.length(),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());this.add(g,m);}
 faceBox(x,z,w,h,depth,angle,r,m){this.add(new T.BoxGeometry(w,depth,h).translate(x,-r,z).rotateZ(angle),m);}
 arch(w,h){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w*.6);s.quadraticCurveTo(w/2,h-w*.22,0,h);s.quadraticCurveTo(-w/2,h-w*.22,-w/2,h-w*.6);s.closePath();return s;}
 outline(w,h,angle,r,z,m,thickness=.045){const pts=this.arch(w,h).getPoints(8);for(let i=1;i<pts.length;i++){const at=p=>new T.Vector3(p.x,-r,z+p.y).applyAxisAngle(new T.Vector3(0,0,1),angle).toArray();this.rod(at(pts[i-1]),at(pts[i]),thickness,m);}}
 create(){
  const texture=brickTexture(),boards=woodTexture();this.resources.add(texture);this.resources.add(boards);const brick=this.material(0xffffff,{map:texture}),trim=this.material(0xba7858),stone=this.material(0xc7bcaa),wood=this.material(0xffffff,{map:boards}),darkWood=this.material(0x49372d),roof=this.material(0x564448),metal=this.material(0x373737),glass=this.material(0x273b3d),door=this.material(0x714228),light=this.material(0xc49d69);
  this.octagon(2.82,.65,0,stone);this.octagon(2.65,14.45,.65,brick,2.46);this.octagon(2.62,.24,14.95,trim);this.octagon(2.7,.25,15.19,stone);this.octagon(2.7,1,15.44,darkWood,4.15);this.octagon(4.15,.24,16.44,darkWood);
  this.octagon(4.03,4.05,16.68,wood);this.octagon(4.2,.18,20.73,darkWood);this.octagon(4.55,1.3,20.91,roof,.95);
  this.octagon(1.01,1.8,22.21,wood);this.octagon(1.25,.65,24.01,roof,0);this.rod([0,0,24.6],[0,0,25],.027,metal);
  for(let i=0;i<8;i++){
   const a=i*OCT,r=2.65*Math.cos(Math.PI/8),upper=4.03*Math.cos(Math.PI/8),corner=a+Math.PI/8;
   // Narrow pilasters and pointed recesses articulate each brick face.
   for(const side of [-1,1])this.faceBox(side*.86,7.8,.13,14,.12,a,r+.02,trim);
   this.outline(1.48,12.6,a,r+.08,1.4,trim,.065);
   const z=i%2?9.7:11.6;this.face(new T.ShapeGeometry(this.arch(.82,2.45)),a,r+.12,z,glass);this.outline(.93,2.6,a,r+.16,z-.06,stone,.045);
   this.faceBox(0,z+1,.05,1.9,.055,a,r+.2,darkWood);this.faceBox(0,z+1.25,.8,.05,.055,a,r+.2,darkWood);
   this.faceBox(0,z-.04,1.04,.12,.24,a,r+.2,stone);
   // Stone foundation courses; wooden siding, corner posts, window frames and panes.
   for(const h of [.18,.39,.61])this.faceBox(0,h,2.12,.035,.025,a,2.82*Math.cos(Math.PI/8)+.015,trim);
   this.box(Math.sin(corner)*4.04,-Math.cos(corner)*4.04,18.7,.18,.18,4.22,darkWood,corner);
   this.faceBox(0,18.7,1.05,1.92,.06,a,upper+.08,darkWood);this.faceBox(0,18.7,.79,1.62,.08,a,upper+.13,glass);
   for(const x of [-.52,.52])this.faceBox(x,18.7,.12,2.1,.13,a,upper+.19,darkWood);
   for(const h of [17.7,19.72])this.faceBox(0,h,1.18,.15,.14,a,upper+.19,darkWood);
   for(const x of [-.25,0,.25])this.faceBox(x,18.7,.025,1.62,.06,a,upper+.22,light);
   for(const h of [18.2,18.7,19.2])this.faceBox(0,h,.79,.025,.06,a,upper+.22,light);
   // Eight supporting brackets and standing seams on the roof.
   const p=(radius,z)=>[Math.sin(a)*radius,-Math.cos(a)*radius,z];this.rod(p(2.52,15.1),p(3.94,16.48),.085,darkWood);this.rod(p(4.5,20.96),p(.95,22.24),.035,metal);
   const cr=1.01*Math.cos(Math.PI/8);this.faceBox(0,23.1,.53,1.25,.03,a,cr+.035,glass);for(const x of [-.33,.33])this.faceBox(x,23.1,.1,1.75,.07,a,cr+.07,darkWood);
   // Small open gallery around the lantern.
   for(const h of [22.3,22.88])this.faceBox(0,h,1.32,.065,.06,a,1.58,metal);
   for(const x of [-.65,-.33,0,.33,.65])this.faceBox(x,22.58,.035,.64,.04,a,1.58,metal);
  }
  const front=0,r=2.65*Math.cos(Math.PI/8);this.face(new T.ShapeGeometry(this.arch(1.26,2.23)),front,r+.22,.05,door);this.outline(1.42,2.4,front,r+.27,.1,stone,.085);
  for(const x of [-.36,0,.36])this.faceBox(x,.8,.035,1.48,.05,front,r+.3,darkWood);this.faceBox(.38,1.03,.07,.07,.08,front,r+.35,light);
  // Geometry-based date on the front, without downloading fonts or images.
  const segments={1:[1,2],9:[0,1,2,3,5,6],6:[0,2,3,4,5,6]};
  const lines=[[0,.3,.16,.025],[.09,.22,.025,.13],[.09,.07,.025,.13],[0,0,.16,.025],[-.09,.07,.025,.13],[-.09,.22,.025,.13],[0,.15,.16,.025]];
  for(const [i,d] of [...'1916'].entries())for(const k of segments[d]){const [x,z,w,h]=lines[k];this.faceBox((i-1.5)*.27+x,14.15+z,w,h,.025,front,r+.2,darkWood);}
  for(const [m,parts] of this.batches){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());this.resources.add(g);const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;this.group.add(mesh);}this.batches.clear();
 }
 dispose(){this.resources.forEach(r=>r.dispose());this.resources.clear();this.group.removeFromParent();}
}
