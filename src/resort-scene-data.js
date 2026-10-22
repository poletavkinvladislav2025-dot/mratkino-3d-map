// Deterministic illustration geometry. Source GeoJSON is never rewritten.
import { SUMMIT } from './map-data.js';
const R=6371008.8, RAD=Math.PI/180, C=Math.cos(SUMMIT[1]*RAD);
export const toLocal=([lng,lat])=>[(lng-SUMMIT[0])*RAD*R*C,(lat-SUMMIT[1])*RAD*R];
export const toLngLat=([x,y])=>[SUMMIT[0]+x/(RAD*R*C),SUMMIT[1]+y/(RAD*R)];
export function insideRing(p,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function insideGeometry(p,g){
 const polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
 return polygons.some(rings=>insideRing(p,rings[0])&&!rings.slice(1).some(r=>insideRing(p,r)));
}
export function distanceToLine(p,line){
 let distance=Infinity;
 for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));
 }
 return distance;
}
function random(seed=73021){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function saplingPlacements(data){
 const rand=random(41937);
 const active=data.trails.features.filter(f=>f.geometry.type==='LineString'&&f.properties.name!=='С1').map(f=>f.geometry.coordinates.map(toLocal));
 const lifts=data.lifts.features.map(f=>f.geometry.coordinates.map(toLocal));
 const result=[];
 const closed=data.trails.features.find(f=>f.properties.name==='С1'&&f.geometry.type==='LineString');
 if(closed){
  const line=closed.geometry.coordinates.map(toLocal),length=pathLength(line);
  // An illustrative narrow corridor around the mapped C1 centreline, not a surveyed extent.
  for(let d=25;d<length-25;d+=13){
   const p=samplePath(line,d),side=(rand()-.5)*16;
   const point=[p.point[0]-Math.sin(p.angle)*side,p.point[1]+Math.cos(p.angle)*side];
   if(active.some(l=>distanceToLine(point,l)<17)||lifts.some(l=>distanceToLine(point,l)<10))continue;
   result.push({lngLat:toLngLat(point),height:1.1+rand()*1.7,radius:.5+rand()*.55,rotation:rand()*Math.PI*2,kind:'sapling'});
  }
 }
 return result;
}
export function pathLength(points){let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(...points[i].map((v,j)=>v-points[i-1][j]));return length;}
export function samplePath(points,distance){
 if(points.length<2)throw Error('A path needs at least two points');
 let left=Math.max(0,distance);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=Math.hypot(...b.map((v,j)=>v-a[j]));
  if(left<=length||i===points.length-1){const t=Math.min(left/(length||1),1);return {point:a.map((v,j)=>v+(b[j]-v)*t),angle:Math.atan2(b[1]-a[1],b[0]-a[0])};}
  left-=length;
 }
}
export function liftLoop(line,halfWidth=3){
 const side=(i)=>{const a=line[Math.max(0,i-1)],b=line[Math.min(line.length-1,i+1)];return Math.atan2(b[1]-a[1],b[0]-a[0]);};
 const offset=(p,angle,sign)=>[p[0]-Math.sin(angle)*halfWidth*sign,p[1]+Math.cos(angle)*halfWidth*sign,p[2]];
 const loop=line.map((p,i)=>offset(p,side(i),1));
 const turn=(p,angle,start)=>{for(let i=1;i<=6;i++){const a=start-i*Math.PI/6;loop.push([p[0]+Math.cos(a)*halfWidth,p[1]+Math.sin(a)*halfWidth,p[2]]);}};
 turn(line.at(-1),side(line.length-1),side(line.length-1)+Math.PI/2);
 for(let i=line.length-2;i>=0;i--)loop.push(offset(line[i],side(i),-1));
 turn(line[0],side(0),side(0)-Math.PI/2);
 loop.push([...loop[0]]);return loop;
}

export function decodeForestInstances(buffer){
 const view=new DataView(buffer);
 if(buffer.byteLength<32||String.fromCharCode(...new Uint8Array(buffer,0,4))!=='MRFP'||view.getUint16(4,true)!==1||view.getUint16(6,true)!==8)throw Error('Invalid forest instance format');
 const count=view.getUint32(8,true),spacing=view.getUint32(12,true);
 if(buffer.byteLength!==32+count*8||Math.abs(view.getFloat64(16,true)-SUMMIT[0])>1e-8||Math.abs(view.getFloat64(24,true)-SUMMIT[1])>1e-8)throw Error('Forest instance origin or size mismatch');
 const positions=new Float32Array(count*3),seeds=new Uint16Array(count);
 for(let i=0;i<count;i++){const offset=32+i*8;positions[i*3]=view.getInt16(offset,true)/10;positions[i*3+1]=view.getInt16(offset+2,true)/10;positions[i*3+2]=view.getInt16(offset+4,true)/10;seeds[i]=view.getUint16(offset+6,true);}
 return {count,spacing,positions,seeds};
}
export function forestLOD(pool,center,{mobile=false,zoom=14,bounds}={}){
 const [cx,cy]=toLocal(center),radius=zoom>=15.1?(mobile?240:330):0;
 const near=[],far=[],mask=mobile?7:3;
 const box=bounds?bounds.map(toLocal):null;
 const margin=150;
 for(let i=0;i<pool.count;i++){
  const x=pool.positions[i*3],y=pool.positions[i*3+1];
  if(box&&(x<box[0][0]-margin||x>box[1][0]+margin||y<box[0][1]-margin||y>box[1][1]+margin))continue;
  const dx=x-cx,dy=y-cy,distance=dx*dx+dy*dy;
  if(radius&&distance<radius*radius)near.push(i);
  if((pool.seeds[i]&mask)===0&&(!radius||distance>(radius-40)**2))far.push(i);
 }
 return {near,far,radius};
}
export function treeAppearance(seed){return {height:20+(seed%1001)/100,radius:5+((seed>>>5)%141)/100,rotation:seed/65535*Math.PI*2};}
export function liftVehicle(route,index,elapsed){
 if(!route.length)return {index,sample:null,ascending:false};
 const distance=(index/route.count*route.length+elapsed*(route.chair?2.1:1.5))%route.length;
 return {index,sample:samplePath(route.points,distance),ascending:distance<route.ascentLength,distance};
}
