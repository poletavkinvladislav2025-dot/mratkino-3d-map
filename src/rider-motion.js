// Decorative carving on mapped piste polygons; no tourist route or source geometry is altered.
import {insideGeometry,toLocal,pathLength,samplePath} from './resort-scene-data.js';
export const ACTIVE_RIDER_TRAILS=new Set(['Ю1','Ю2','Ю3','Ю4','С2','С3']);
export const ridersPerTrail=mobile=>mobile?8:20;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function riderProfile(routeIndex,index,name){
 const seed=routeIndex*71+index*37,board=(routeIndex+index)%3===0;
 return {board,speed:3.6+(seed%23)*.16,wavelength:board?48+seed%31:28+seed%19,amplitude:board?(name==='Ю4'?10:6):3.4,phase:(seed%29)/29*Math.PI*2,color:seed%6};
}
export function localRiderAreas(features){
 const walk=points=>typeof points[0]==='number'?toLocal(points):points.map(walk);
 return features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)).map(f=>{
  const geometry={type:f.geometry.type,coordinates:walk(f.geometry.coordinates)};
  const points=geometry.coordinates.flat(geometry.type==='Polygon'?1:2);
  return {geometry,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]};
 });
}
export function insideRiderArea(point,areas){return areas.some(({geometry,bounds:[w,s,e,n]})=>point[0]>=w&&point[0]<=e&&point[1]>=s&&point[1]<=n&&insideGeometry(point,geometry));}
export function buildRiderCorridor(line,areas,{spacing=6,maxWidth=14}={}){
 const length=pathLength(line),frames=[];
 const frameAt=d=>{
  const {point,angle}=samplePath(line,d),normal=[-Math.sin(angle),Math.cos(angle)];
  const widths=[1,-1].map(sign=>{
   if(!insideRiderArea(point,areas))return 0;
   let width=0;for(let step=.75;step<=maxWidth;step+=.75){if(!insideRiderArea([point[0]+normal[0]*step*sign,point[1]+normal[1]*step*sign],areas))break;width=step;}
   return Math.max(0,width-1.25); // Space for a human figure and the board near an edge.
  });
  return {d,point,normal,left:widths[0],right:widths[1]};
 };
 for(let d=0;d<length;d+=spacing)frames.push(frameAt(d));frames.push(frameAt(length));
 // Conservative widths over neighbouring samples keep turns away from corners and holes.
 const safe=frames.map((f,i)=>({...f,left:Math.min(...frames.slice(Math.max(0,i-3),i+4).map(p=>p.left)),right:Math.min(...frames.slice(Math.max(0,i-3),i+4).map(p=>p.right))}));
 return {frames:safe,length,spacing,areas};
}
function curvePoint(corridor,d,profile){
 d=clamp(d,0,corridor.length);const i=Math.min(Math.floor(d/corridor.spacing),corridor.frames.length-2),a=corridor.frames[i],b=corridor.frames[i+1],t=clamp((d-a.d)/(b.d-a.d||1),0,1);
 const point=a.point.map((v,j)=>v+(b.point[j]-v)*t),nx=a.normal[0]+(b.normal[0]-a.normal[0])*smooth(t),ny=a.normal[1]+(b.normal[1]-a.normal[1])*smooth(t),norm=Math.hypot(nx,ny)||1;
 const width=Math.min(a.left,b.left,a.right,b.right)*.8,amplitude=Math.min(profile.amplitude,width)*smooth(Math.min(d,corridor.length-d)/20),wave=d/profile.wavelength*Math.PI*2+profile.phase,offset=amplitude*Math.sin(wave);
 return {point:[point[0]+nx/norm*offset,point[1]+ny/norm*offset],offset,amplitude,wave};
}
export function riderState(corridor,profile,distance){
 if(!corridor||corridor.frames.length<2||!corridor.length)return null;
 const d=((distance%corridor.length)+corridor.length)%corridor.length,current=curvePoint(corridor,d,profile),before=curvePoint(corridor,Math.max(0,d-1),profile),after=curvePoint(corridor,Math.min(corridor.length,d+1),profile);
 const heading=Math.atan2(after.point[1]-before.point[1],after.point[0]-before.point[0]);
 const curvature=-current.amplitude*(2*Math.PI/profile.wavelength)**2*Math.sin(current.wave);
 return {...current,distance:d,heading,lean:clamp(Math.atan(profile.speed**2*curvature/9.81),-.48,.48),fade:smooth(Math.min(d,corridor.length-d)/12),inside:insideRiderArea(current.point,corridor.areas)};
}
