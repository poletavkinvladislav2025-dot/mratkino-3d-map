import * as T from 'three';

export class CityLandmark {
 constructor(scene, plan, {mobile, elevationAt}) {
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
  const building = (x,y,w,d,h,wall,roof,columns=0) => {
   box(g,x,y,h/2,w,d,h,wall);
   box(g,x,y,h+.32,w+1,d+1,.65,roof);
   for(let floor=0;floor<2;floor++){
    for(let column=1;column<6;column++)
     box(g,x+w*(column/6-.5),y-d/2-.08,h*(.28+floor*.38),1.15,.18,1.65,0x263e47);
   }
   for(let i=0;i<columns;i++)
    box(g,x+(i-(columns-1)/2)*2.4,y-d/2-1,h*.36,.66,.72,h*.72,0xf0e4cc);
  };
  if(plan.model==='houses'){
   building(0,-10,19,13,7.8,0x944c41,0x3f4346);
   box(g,8,-6,6,4.5,5,12,0x874136);
   building(0,10,17,13,8.5,0x994e41,0x424549);
   box(g,-7,10,5.5,4.6,5.2,11,0x8d4539);
  } else if(plan.model==='cinema'){
   building(0,0,35,25,13,0xcba577,0x70665b,6);
   box(g,0,-15,6,18,5,12,0xd4b485);
   for(let i=0;i<6;i++) box(g,(i-2.5)*2.5,-17.6,5, .65,.7,10,0xe5d1aa);
   box(g,0,-15,12.3,20,5.5,1.1,0xe5d1aa);
  } else if(plan.model==='palace'){
   building(0,0,33,22,14,0xdcc6a2,0x77716a);
   building(-18,6,12,24,10,0xcebc9f,0x77716a);
   box(g,0,-11.3,7,11,.6,10,0xb99a75);
  } else if(plan.model==='museum'){
   building(0,0,22,14,8,0xd1b999,0x6f675e);
   box(g,0,-7.2,2.2,3,.4,4.4,0x4f473c);
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
   box(g,0,0,.045,150,24,.09,0x494a4c);
   for(let x=-66;x<=66;x+=12)box(g,x,0,.11,4,.23,.02,0xc7c3b5);
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
   round(g,0,0,1.2,.45,.45,1.2,0x86adba);
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
