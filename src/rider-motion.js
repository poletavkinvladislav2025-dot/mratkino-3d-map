// Decorative carving on mapped piste polygons; no tourist route or source geometry is altered.
import {insideGeometry,toLocal,pathLength,samplePath} from './resort-scene-data.js';
export const ACTIVE_RIDER_TRAILS=new Set(['Ю1','Ю2','Ю3','Ю4','С2','С3']);
// Source polygons matched by centreline coverage. Ю1 and Ю2 share a mapped bottom apron.
export const RIDER_AREA_IDS={С2:['way/933845738'],С3:['way/933845736'],Ю1:['way/933845746','way/933845745'],Ю2:['way/933845745'],Ю3:['way/933845742'],Ю4:['way/933845741']};
export const riderAreasForTrail=(areas,name)=>areas.filter(a=>RIDER_AREA_IDS[name]?.includes(a.id));
export const ridersPerTrail=mobile=>mobile?24:60;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function riderProfile(routeIndex,index,name){
 const seed=routeIndex*71+index*37,board=(routeIndex+index)%3===0;
 const lane=.035+((index*.61803398875+routeIndex*.37)%1)*.93;
 return {board,speed:3.6+(seed%97)*.038,wavelength:board?96+seed%101:72+seed%79,lane,weave:board?(name==='Ю4'?.45:.33):.16+(seed%11)*.012,phase:(seed%53)/53*Math.PI*2,color:seed%6};
}
export function localRiderAreas(features){
 const walk=points=>typeof points[0]==='number'?toLocal(points):points.map(walk);
 return features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)).map(f=>{
  const geometry={type:f.geometry.type,coordinates:walk(f.geometry.coordinates)};
  const points=geometry.coordinates.flat(geometry.type==='Polygon'?1:2);
  return {id:f.properties?.id,geometry,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]};
 });
}
export function insideRiderArea(point,areas){return areas.some(({geometry,bounds:[w,s,e,n]})=>point[0]>=w&&point[0]<=e&&point[1]>=s&&point[1]<=n&&insideGeometry(point,geometry));}
function rayWidth(point,normal,areas){
 const cuts=[];
 for(const {geometry} of areas){const rings=geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat();for(const ring of rings)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],ex=b[0]-a[0],ey=b[1]-a[1],den=normal[0]*ey-normal[1]*ex;if(Math.abs(den)<1e-9)continue;
  const ax=a[0]-point[0],ay=a[1]-point[1],t=(ax*ey-ay*ex)/den,u=(ax*normal[1]-ay*normal[0])/den;
  if(t>0&&u>=0&&u<=1)cuts.push(t);
 }}
 for(const t of cuts.sort((a,b)=>a-b))if(!insideRiderArea([point[0]+normal[0]*(t+.05),point[1]+normal[1]*(t+.05)],areas))return Math.max(0,t-2.5);
 return 0;
}
export function buildRiderCorridor(line,areas,{spacing=4}={}){
 const length=pathLength(line),frames=[];
 const frameAt=d=>{
  const {point,angle}=samplePath(line,d),normal=[-Math.sin(angle),Math.cos(angle)];
  const widths=[1,-1].map(sign=>{
   if(!insideRiderArea(point,areas))return 0;
   return rayWidth(point,normal.map(v=>v*sign),areas);
  });
  return {d,point,normal,left:widths[0],right:widths[1]};
 };
 for(let d=0;d<length;d+=spacing)frames.push(frameAt(d));frames.push(frameAt(length));
 // Conservative widths over neighbouring samples keep turns away from corners and holes.
 const safe=frames.map((f,i)=>({...f,left:Math.min(...frames.slice(Math.max(0,i-1),i+2).map(p=>p.left)),right:Math.min(...frames.slice(Math.max(0,i-1),i+2).map(p=>p.right))}));
 return {frames:safe,length,spacing,areas};
}
function curvePoint(corridor,d,profile){
 d=clamp(d,0,corridor.length);const i=Math.min(Math.floor(d/corridor.spacing),corridor.frames.length-2),a=corridor.frames[i],b=corridor.frames[i+1],t=clamp((d-a.d)/(b.d-a.d||1),0,1);
 const point=a.point.map((v,j)=>v+(b.point[j]-v)*t),nx=a.normal[0]+(b.normal[0]-a.normal[0])*smooth(t),ny=a.normal[1]+(b.normal[1]-a.normal[1])*smooth(t),norm=Math.hypot(nx,ny)||1;
 const left=Math.min(a.left,b.left),right=Math.min(a.right,b.right),envelope=smooth(Math.min(d,corridor.length-d)/20),base=profile.lane===undefined?0:-right+(left+right)*profile.lane;
 const amplitude=Math.max(0,Math.min(profile.amplitude??(left+right)*profile.weave,left-base,right+base))*envelope,wave=d/profile.wavelength*Math.PI*2+profile.phase,offset=base*envelope+amplitude*Math.sin(wave);
 return {point:[point[0]+nx/norm*offset,point[1]+ny/norm*offset],offset,amplitude,wave};
}
export function riderState(corridor,profile,distance){
 if(!corridor||corridor.frames.length<2||!corridor.length)return null;
 const d=((distance%corridor.length)+corridor.length)%corridor.length,current=curvePoint(corridor,d,profile),before=curvePoint(corridor,Math.max(0,d-1),profile),after=curvePoint(corridor,Math.min(corridor.length,d+1),profile);
 const heading=Math.atan2(after.point[1]-before.point[1],after.point[0]-before.point[0]);
 const curvature=-current.amplitude*(2*Math.PI/profile.wavelength)**2*Math.sin(current.wave);
 // Local +X is the rider's right side; signed path curvature uses the left normal.
 return {...current,distance:d,heading,lean:clamp(-Math.atan(profile.speed**2*curvature/9.81),-.48,.48),fade:smooth(Math.min(d,corridor.length-d)/12),inside:insideRiderArea(current.point,corridor.areas)};
}

const separation=2.8,cellSize=4;
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);}
/** Shared spatial reservations keep figures apart across adjacent and merging pistes.
 * A blocked rider waits at the previous safe position; new arrivals enter only when clear.
 */
export function advanceCrowd(agents,dt,{initial=false,blocked=()=>false}={}){
 const current=agents.map(a=>a.corridor?riderState(a.corridor,a.profile,a.distance):null),cells=new Map(),accepted=new Map();
 const add=(map,point,value)=>{const key=Math.floor(point[0]/cellSize)+','+Math.floor(point[1]/cellSize);if(!map.has(key))map.set(key,[]);map.get(key).push(value);};
 if(!initial)current.forEach((s,i)=>{if(agents[i].active&&s?.inside&&s.fade>.2)add(cells,s.point,{i,point:s.point});});
 const nearby=(map,a,b)=>{const list=[];for(let x=Math.floor((Math.min(a[0],b[0])-separation)/cellSize);x<=Math.floor((Math.max(a[0],b[0])+separation)/cellSize);x++)for(let y=Math.floor((Math.min(a[1],b[1])-separation)/cellSize);y<=Math.floor((Math.max(a[1],b[1])+separation)/cellSize);y++)list.push(...(map.get(x+','+y)||[]));return list;};
 return agents.map((agent,i)=>{
  if(!agent.corridor)return null;
  const old=current[i],ahead=riderState(agent.corridor,agent.profile,agent.distance+1),stretch=old&&ahead&&ahead.distance>old.distance?Math.max(1,Math.hypot(ahead.point[0]-old.point[0],ahead.point[1]-old.point[1])):1;
  const distance=agent.distance+agent.profile.speed*dt/stretch,proposed=riderState(agent.corridor,agent.profile,distance);
  const available=state=>{
   if(!state.inside||blocked(state.point))return false;
   const a=agent.active&&old?.inside&&Math.abs(state.distance-old.distance)<20?old.point:state.point,b=state.point;
   if(nearby(cells,a,b).some(n=>n.i!==i&&segmentDistance(n.point,a,b)<separation))return false;
   return !nearby(accepted,a,b).some(n=>segmentDistance(n.point,a,b)<separation||segmentDistance(b,n.from,n.point)<separation);
  };
  let state=proposed,moving=true;
  if(!available(state)){state=old;moving=false;if(!agent.active||!state||!available(state)){agent.distance=distance;agent.active=false;return state?{...state,clear:false}:null;}}
  if(moving)agent.distance=distance;agent.active=true;
  if(state.fade>.2)add(accepted,state.point,{point:state.point,from:old?.inside&&Math.abs(state.distance-old.distance)<20?old.point:state.point});
  return {...state,clear:true,waiting:!moving};
 });
}
