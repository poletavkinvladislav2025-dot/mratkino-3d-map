import * as T from 'three';

export class CityLandmark {
 constructor(scene, plan, {mobile, elevationAt, building}) {
  this.group = new T.Group();
  this.group.name = plan.id;
  this.elapsed = 0;
  this.cars = [];
  this.elevationAt = elevationAt;
  const materials = new Map();
  const mesh = (parent, geometry, color, x, y, z) => {
   if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({color, roughness:.78}));
   const object = new T.Mesh(geometry, materials.get(color));
   object.position.set(x,y,z);
   parent.add(object);
   return object;
  };
  const box = (parent, x,y,z, w,d,h, color) => mesh(parent,new T.BoxGeometry(w,d,h),color,x,y,z);
  const round = (parent, x,y,z, rx,ry,rz,color,detail=1) => {
   const object=mesh(parent,new T.IcosahedronGeometry(1,detail),color,x,y,z);
   object.scale.set(rx,ry,rz);
   return object;
  };
  const g = this.group;
  if(building){
   const [outer,...holes]=building.rings;
   const path=(polygon,ring)=>{
    polygon.moveTo(...ring[0]);
    for(const point of ring.slice(1))polygon.lineTo(...point);
    polygon.closePath();
    return polygon;
   };
   const shape=path(new T.Shape(),outer);
   shape.holes=holes.map(ring=>path(new T.Path(),ring));
   const height=Number(building.properties.render_height)||({houses:8,cinema:12,palace:13,museum:8}[plan.model]);
   const walls={houses:0x944d40,cinema:0x90ae8d,palace:0xd2be9d,museum:0xc7b6a1};
   mesh(g,new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false}),walls[plan.model],0,0,-.35);
   mesh(g,new T.ShapeGeometry(shape),plan.model==='houses'?0x4d4946:0x77716a,0,0,height-.3);
   const front=building.front;
   if(front){
    const {a,b,length}=front,angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
    const facade=new T.Group();
    const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
    facade.position.set(x,y,0);
    facade.rotation.z=angle;
    g.add(facade);
    const toward=plan.frame.toLocal(plan.facadeToward);
    const sign=Math.sign((toward[0]-x)*-Math.sin(angle)+(toward[1]-y)*Math.cos(angle))||1;
    const width=Math.min(length*.83,plan.model==='cinema'?17:24);
    const facadeBox=(x,y,z,w,d,h,color)=>box(facade,x,y*sign,z,w,d,h,color);
    if(plan.model==='cinema'){
     facadeBox(0,.30,height*.86,width,.9,.68,0xeae4d4);
     for(let i=0;i<6;i++){
      const x=(i-2.5)*width/6;
      facadeBox(x,.45,height*.43,.58,.7,height*.76,0xf0eadc);
      facadeBox(x,.45,height*.81,.86,.82,.35,0xc8aa66);
     }
    }else{
     const count=Math.max(2,Math.min(9,Math.floor(width/2.4)));
     for(let row=0;row<2;row++)for(let i=0;i<count;i++){
      const x=((i+.5)/count-.5)*width;
      facadeBox(x,.08,height*(.29+row*.36),1.05,.16,Math.min(1.6,height*.2),0x384956);
     }
     if(plan.model==='palace')for(let i=0;i<3;i++)
      facadeBox((i-1)*width*.23,.13,height*.65,width*.19,.22,height*.35,[0x8d6d55,0xb2a485,0x726e62][i]);
     if(plan.model==='museum')facadeBox(0,.85,2.75,Math.min(5,width),1.8,.2,0x625e56);
    }
   }
  } else if(plan.model==='plane'){
   box(g,0,0,.42,5.5,3.8,.84,0x777577);
   box(g,0,0,1.75,.65,.7,3.5,0x777577);
   const jet=new T.Group();
   g.add(jet);
   jet.position.z=3.55;
   jet.rotation.y=-.26;
   round(jet,0,0,0,5.4,.6,.59,0xc8cdd0,2);
   round(jet,1.4,0,.48,1.38,.43,.44,0x425b67,2);
   for(const side of [-1,1]){
    const wing=box(jet,-.6,side*2.7,-.08,1.62,4.6,.13,0xc4c9cc);
    wing.rotation.z=side*.13;
    round(jet,.25,side*.62,-.06,.95,.28,.31,0x78848a);
   }
   box(jet,-4,.0,.79,1.1,.15,1.65,0xbfc6ca);
   box(jet,-4.04,0,1.53,1.3,3.3,.14,0xc4c9cc);
  } else if(plan.model==='airport'){
   // The basemap already draws the runway. Avoid painting a second, approximate strip.
   const createCar=color=>{
    const car=new T.Group();
    g.add(car);
    box(car,0,0,.5,4.5,1.85,.66,color);
    box(car,-.25,0,1.02,2.25,1.62,.55,0x394d57);
    for(const x of [-1.4,1.4])for(const y of [-.9,.9])
     round(car,x,y,.32,.32,.14,.32,0x202226,0);
    return car;
   };
   this.cars=[createCar(0xd4a94b),createCar(0xc35243),...(mobile?[]:[createCar(0x7793af)])];
   for(let i=0;i<(mobile?2:4);i++) {
    const car=createCar(i%2?0x99624d:0xb6bbb9);
    car.position.set(-44+i*6,10,elevationAt(-44+i*6,10));
   }
   this.update(0);
  } else if(plan.model==='cliff'){
   for(let i=0;i<7;i++){
    const x=(i-3)*4.1;
    const rock=round(g,x,Math.cos(i)*2,1.3+i%3,4.7,5.1,4+i%3,i%2?0x777b73:0x8b8a7d,0);
    rock.rotation.set(.2,i*.42,i*.71);
   }
  } else if(plan.model==='square'){
   const basin = new T.CylinderGeometry(5.6,5.6,.42,24);
   const object = mesh(g,basin,0xbcb5a2,0,0,.22);
   object.rotation.x=Math.PI/2;
   const water = mesh(g,new T.CylinderGeometry(4.9,4.9,.08,24),0x4e8895,0,0,.47);
   water.rotation.x=Math.PI/2;
   for(const x of [-3,-1.5,0,1.5,3])round(g,x,0,1,.12,.12,.72,0x86adba);
  } else {
   const steel=plan.model==='steelworker';
   const color=steel?0x78736a:0x594c36;
   const height=steel?3.6:2.5;
   box(g,0,0,.65,3.7,3.1,1.3,0x89847e);
   box(g,0,0,1.45,2.5,2.2,.52,0x6c6660);
   round(g,0,0,1.7+height*.63,height*.25,height*.16,height*.30,color);
   round(g,0,0,1.7+height*.94,height*.12,height*.13,height*.14,color);
   for(const side of [-1,1]){
    round(g,side*height*.10,0,1.7+height*.24,height*.082,height*.08,height*.26,color);
    const arm=round(g,side*height*.25,0,1.7+height*.54,height*.075,height*.09,height*.235,color);
    arm.rotation.y=side*(steel?.2:.38);
   }
  }
  scene.add(g);
  this.materials=materials;
 }
 update(dt) {
  if(!this.cars.length)return;
  this.elapsed+=dt;
  for(const [index,car] of this.cars.entries()){
   const theta=this.elapsed*(.16+index*.016)+index*2.15;
   const x=57*Math.cos(theta),y=5.2*Math.sin(theta);
   car.position.set(x,y,this.elevationAt(x,y));
   car.rotation.z=Math.atan2(5.2*Math.cos(theta),-57*Math.sin(theta));
  }
 }
 dispose() {
  this.group.removeFromParent();
  this.group.traverse(object=>object.geometry?.dispose());
  for(const material of this.materials.values())material.dispose();
 }
}
