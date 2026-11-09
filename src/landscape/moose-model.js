import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Bronze family from the project photo; dimensions and relative positions are approximate. */
export class MooseMonument{
 constructor(scene){
  this.group=new T.Group();this.group.name='moose-family';this.resources=new Set();this.animals=[];
  const bronze=new T.MeshLambertMaterial({color:0x765047,flatShading:true}),antler=new T.MeshLambertMaterial({color:0xb19a72,flatShading:true,side:T.DoubleSide}),stone=new T.MeshLambertMaterial({color:0xaaa190,flatShading:true});for(const m of [bronze,antler,stone])this.resources.add(m);
  for(const spec of [{id:'cow',x:-2.4,y:-.6,scale:1,angle:.15},{id:'bull',x:0,y:1,scale:1.08,angle:-.6},{id:'calf',x:2.4,y:-1.1,scale:.68,angle:-.6}]){
   const animal=new T.Group(),pieces=[],horns=[];
   const ellipsoid=(x,y,z,sx,sy,sz)=>{const g=new T.IcosahedronGeometry(1,2).scale(sx,sy,sz).translate(x,y,z);pieces.push(g);};
   const rod=(a,b,r)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);const g=new T.CylinderGeometry(r*.8,r,d.length(),7).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize())).translate(...start.add(end).multiplyScalar(.5).toArray());pieces.push(g);};
   ellipsoid(0,0,1.9,.48,1.05,.66);ellipsoid(0,.55,2.2,.48,.48,.7);
   for(const x of [-.29,.29])for(const y of [-.65,.65]){rod([x,y,1.72],[x*1.18,y+.06,.25],.085);ellipsoid(x*1.18,y+.11,.21,.13,.19,.12);}
   rod([0,.65,2.1],[0,1,2.9],.29);ellipsoid(0,1,2.91,.29,.4,.43);ellipsoid(0,1.39,2.6,.26,.46,.3);
   for(const x of [-.31,.31])ellipsoid(x,.95,3.34,.12,.18,.34);
   if(spec.id==='bull'){
    ellipsoid(0,.85,2.31,.14,.2,.36);
    for(const side of [-1,1]){
     rod([side*.16,.95,3.12],[side*.57,.9,3.45],.055);
     const shape=new T.Shape();shape.moveTo(0,0);for(const [x,z] of [[.26,.1],[.61,.05],[.8,.56],[.74,.88],[.62,.42],[.55,.88],[.43,.39],[.31,.77],[.21,.28],[.1,.58]])shape.lineTo(x,z);shape.closePath();
     const g=new T.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false,steps:1}).rotateX(Math.PI/2).scale(side,1,1).translate(side*.42,.92,3.32);horns.push(g);
    }
   }
   const base=new T.CylinderGeometry(.85,.95,.16,9).rotateX(Math.PI/2).scale(1,1.7,1).translate(0,0,.08);this.resources.add(base);animal.add(new T.Mesh(base,stone));
   for(const [list,material] of [[pieces,bronze],[horns,antler]])if(list.length){const normalized=list.map(g=>{if(!g.index)return g;const n=g.toNonIndexed();g.dispose();return n;});const geometry=mergeGeometries(normalized);normalized.forEach(g=>g.dispose());this.resources.add(geometry);animal.add(new T.Mesh(geometry,material));}
   animal.position.set(spec.x,spec.y,0);animal.rotation.z=spec.angle;animal.scale.setScalar(spec.scale);animal.name=spec.id;this.group.add(animal);this.animals.push(animal);
  }
  scene.add(this.group);
 }
 dispose(){this.group.removeFromParent();this.resources.forEach(r=>r.dispose());this.resources.clear();}
}
