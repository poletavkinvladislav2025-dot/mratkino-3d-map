import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rockColumns} from './malinovaya-rock-plan.js';
/** Approximate quartzite forms; only the plan line is surveyed OSM geometry. */
export class MalinovayaRockModel{
 constructor(scene,height){this.group=new T.Group();this.group.name='first-malinovaya-rocks';this.resources=new Set();this.columns=rockColumns(height);const pieces=[],colors=[0x8a9498,0xa1abae,0x969fa1,0xafb8b9,0x788487];
  const paint=(g,seed)=>{if(g.index){const n=g.toNonIndexed();g.dispose();g=n;}const a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length/3;i++){const c=new T.Color(colors[Math.floor(seed/31)%colors.length]).multiplyScalar(.92+(Math.floor(i/6)%3)*.035);a.set([c.r,c.g,c.b],i*3);}g.setAttribute('color',new T.BufferAttribute(a,3));pieces.push(g);};
  for(const c of this.columns){const rows=Math.ceil((c.top-c.base)/4.5),h=(c.top-c.base)/rows;
   for(let row=0;row<rows;row++){
    const seed=c.index*31+row*13,w=c.width*(.95+(seed%7)*.012),depth=c.depth*(.9+(seed%5)*.04),g=new T.CylinderGeometry(.92+(seed%5)*.035,1,h-.055,6).rotateX(Math.PI/2).rotateZ(.15*Math.sin(c.index)).scale(w*.64,depth*.62,1),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),jitter=Math.sin(x*7+y*5+seed)*.3;
     p.setXYZ(i,c.x+Math.cos(c.angle)*(x+jitter)-Math.sin(c.angle)*(y-2.3-Math.sin(c.index*2.3)*1.3),c.y+Math.sin(c.angle)*(x+jitter)+Math.cos(c.angle)*(y-2.3-Math.sin(c.index*2.3)*1.3),c.base+h*(row+.5)+z+(Math.sin(x*2+y+c.index)*.38+(row===rows-1&&z>0?Math.sin(x+y+seed)*1.7:0)));
    }g.computeVertexNormals();paint(g,seed);
   }
   if(c.index%3===0){const d=12+(c.index*17%19),x=c.x+c.normal[0]*d+Math.sin(c.index)*4,y=c.y+c.normal[1]*d+Math.cos(c.index)*4,z=height(x,y);const g=new T.DodecahedronGeometry(.7+(c.index%7)*.25).scale(1.6,1.1,.8).rotateZ(c.angle).translate(x,y,z+.7);paint(g,c.index);}
  }
  const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());const material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,flatShading:true});this.resources.add(geometry);this.resources.add(material);const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;this.group.add(mesh);scene.add(this.group);
 }
 dispose(){this.resources.forEach(r=>r.dispose());this.resources.clear();this.group.removeFromParent();}
}
