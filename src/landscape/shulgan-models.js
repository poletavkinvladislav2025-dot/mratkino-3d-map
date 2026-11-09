import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Illustrative Shulgan-Tash scenes. Z is up, local Y points away from the viewer before the plan bearing.
 * Sizes are approximate (the cave grot is about 40 m wide); they explain the place, they are not a survey. */

function merged(list){const flat=list.map(g=>{if(!g.index)return g;const n=g.toNonIndexed();g.dispose();return n;});const g=mergeGeometries(flat);flat.forEach(x=>x.dispose());return g;}
class Base{
 constructor(scene,name){this.group=new T.Group();this.group.name=name;this.resources=new Set();this.scene=scene;}
 material(color,extra={}){const m=new T.MeshLambertMaterial({color,flatShading:true,...extra});this.resources.add(m);return m;}
 mesh(geometries,material,name){const g=Array.isArray(geometries)?merged(geometries):geometries;this.resources.add(g);const m=new T.Mesh(g,material);if(name)m.name=name;this.group.add(m);return m;}
 dispose(){this.group.removeFromParent();this.resources.forEach(r=>r.dispose());this.resources.clear();}
}

/** Limestone cliff with the large arched grot, the Shulgan stream and the blue lake in front. */
export class ShulganCave extends Base{
 constructor(scene){
  super(scene,'shulgan-tash-cave');
  const W=92,H=40,D=34,archW=36,archH=21;
  // Front outline with an uneven crest, arch cut out as a hole; extruded into the hill (+Y).
  const shape=new T.Shape();shape.moveTo(-W/2,0);
  const crest=[[-W/2,H*.62],[-W*.36,H*.8],[-W*.22,H*.74],[-W*.1,H*.95],[0,H],[W*.12,H*.9],[W*.25,H*.97],[W*.38,H*.78],[W/2,H*.66]];
  for(const [x,z] of crest)shape.lineTo(x,z);shape.lineTo(W/2,0);shape.closePath();
  const arch=new T.Path();arch.moveTo(-archW/2,0);arch.lineTo(-archW/2,archH-archW/2);arch.absarc(0,archH-archW/2,archW/2,Math.PI,0,true);arch.lineTo(archW/2,0);arch.closePath();shape.holes.push(arch);
  const cliff=new T.ExtrudeGeometry(shape,{depth:D,bevelEnabled:false,curveSegments:14}).rotateX(Math.PI/2).translate(0,D,0);
  // Uneven ledges on the face make it read as rock rather than a wall.
  const ledges=[];for(let i=0;i<9;i++){const x=-W/2+8+i*(W-16)/8,z=archH+4+((i*7)%5)*2.6;if(Math.abs(x)<archW/2+2&&z<archH+6)continue;ledges.push(new T.BoxGeometry(7+(i%3)*2,2.4,1.6).translate(x,-0.6,z));}
  const rubble=[];for(let i=0;i<14;i++){const a=i*2.39,r=archW/2+6+(i%4)*5;rubble.push(new T.DodecahedronGeometry(1.4+(i%3)*.9,0).translate(Math.cos(a)*r*.9,-6-(i%5)*2.2,.6));}
  this.mesh([cliff,...ledges],this.material(0xc9c2ae),'cliff');
  this.mesh(rubble,this.material(0xa59e8c),'rubble');
  // Dark grot: half-tube and back wall so the opening reads as depth.
  const tube=new T.CylinderGeometry(archW/2-.4,archW/2-.4,D,24,1,true,-Math.PI/2,Math.PI).translate(0,D/2,archH-archW/2);
  const walls=new T.BoxGeometry(archW-.8,D,archH-archW/2).translate(0,D/2,(archH-archW/2)/2);
  const back=new T.PlaneGeometry(archW,archH).rotateX(Math.PI/2).translate(0,D-.5,archH/2);
  this.mesh([tube,back],this.material(0x1d1b19,{side:T.DoubleSide}),'grot');this.mesh(walls,this.material(0x26231f,{side:T.BackSide}),'grot-walls');
  // The hill behind the cliff can poke into the grot; a dark arch just inside the face keeps the opening readable.
  const door=new T.Shape();door.moveTo(-archW/2+.3,0);door.lineTo(-archW/2+.3,archH-archW/2);door.absarc(0,archH-archW/2,archW/2-.3,Math.PI,0,true);door.lineTo(archW/2-.3,0);door.closePath();
  const reveal=new T.CylinderGeometry(archW/2-.2,archW/2-.2,2.2,24,1,true,-Math.PI/2,Math.PI).translate(0,1.1,archH-archW/2);
  this.mesh(new T.ShapeGeometry(door,14).rotateX(Math.PI/2).translate(0,2.2,0),this.material(0x14110e,{side:T.DoubleSide}),'grot-shadow');
  this.mesh(reveal,this.material(0x3b352e,{side:T.DoubleSide}),'grot-reveal');
  // Stream from the grot to the lake, and the lake (blue karst spring).
  const stream=new T.PlaneGeometry(9,30).translate(0,-12,.25);
  const lake=new T.CircleGeometry(1,40).scale(30,20,1).translate(4,-44,.3);
  this.mesh([stream,lake],this.material(0x2f93ad,{flatShading:false}),'water');
  scene.add(this.group);
 }
}

/** A tall pine with a bort (wild-hive hollow), board cover, climbing rope, a swarm and two log hives. */
export class BortTree extends Base{
 constructor(scene){
  super(scene,'shulgan-tash-bort');
  const trunk=[new T.CylinderGeometry(.42,.62,20,9).rotateX(Math.PI/2).translate(0,0,10)];
  this.mesh(trunk,this.material(0x80603f),'trunk');
  const crown=[];for(const [z,r,h] of [[13.5,3.4,4],[16,2.8,3.6],[18.3,2.1,3.2],[20.3,1.3,2.6]])crown.push(new T.ConeGeometry(r,h,8).rotateX(Math.PI/2).translate(0,0,z));
  this.mesh(crown,this.material(0x2f5a3a),'crown');
  // Hollow at about 7 m on the front (−Y) side, with the board (должея) beside it.
  this.mesh(new T.BoxGeometry(.42,.3,1.15).translate(0,-.5,7.2),this.material(0x15120f),'hollow');
  this.mesh([new T.BoxGeometry(.5,.12,1.3).translate(.42,-.58,7.2),new T.BoxGeometry(.08,.1,.5).translate(.42,-.66,7.7)],this.material(0xc49a62),'board');
  // Climbing rope (кирам) down the trunk.
  const a=new T.Vector3(-.5,-.4,8.4),b=new T.Vector3(-1.1,-1.4,0),d=b.clone().sub(a);
  this.mesh(new T.CylinderGeometry(.045,.045,d.length(),5).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize())).translate(...a.clone().add(b).multiplyScalar(.5).toArray()),this.material(0xb8a27a),'rope');
  // Log hives (колоды) on the ground.
  const logs=[],roofs=[];for(const [x,y,ang] of [[4.2,-2.5,.4],[-4.6,-1.4,-.3]]){logs.push(new T.CylinderGeometry(.42,.42,1.5,10).rotateZ(ang).translate(x,y,.75));roofs.push(new T.BoxGeometry(1.1,1.1,.12).rotateZ(ang).translate(x,y,1.56));}
  this.mesh(logs,this.material(0x9a774f),'log-hives');this.mesh(roofs,this.material(0x6e5539),'hive-roofs');
  // Bees are enlarged so they are visible from the map camera; positions follow a loose swirl.
  const bodies=[],wings=[];
  for(let i=0;i<34;i++){const t=i/34,ang=t*Math.PI*7,r=.9+t*2.4,x=Math.cos(ang)*r,y=-1.2+Math.sin(ang)*r*.7,z=7.2+Math.sin(i*1.3)*1.6+(t-.5)*2.2;
   bodies.push(new T.SphereGeometry(.16,6,4).scale(1,1.6,1).rotateZ(ang).translate(x,y,z));
   wings.push(new T.PlaneGeometry(.34,.18).rotateZ(ang).translate(x,y,z+.14));}
  this.bees=this.mesh(bodies,this.material(0xe2ad25),'bees');this.wings=this.mesh(wings,this.material(0xf4f2ea,{side:T.DoubleSide,transparent:true,opacity:.75}),'wings');
  // Enlarged so the bort stands out over the illustrative forest around it.
  const inner=new T.Group();inner.name='bort-scaled';inner.scale.setScalar(1.7);inner.add(...this.group.children);this.group.add(inner);
  scene.add(this.group);
 }
}
