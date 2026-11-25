import plans from './landmark-plans.json' with {type:'json'};
import cityLandmarks from '../region/beloretsk-landmarks.json' with {type:'json'};
import {localFrame} from '../resort-scene-data.js';
function runwayAngle(plan){
 const frame=localFrame(plan.coordinates);
 const a=frame.toLocal(plan.runway.line[0]),b=frame.toLocal(plan.runway.line.at(-1));
 return Math.atan2(a[1]-b[1],a[0]-b[0])*180/Math.PI;
}
const cityPlans=cityLandmarks.map(p=>({...p,kind:'city-landmark',center:p.coordinates,
 bearing:p.runway?runwayAngle(p):0,enter:p.model==='airport'?15.7:17.7,
 exit:p.model==='airport'?15.4:17.4,radiusKm:p.model==='airport'?.7:.28}));
export const LANDMARKS=[...plans,...cityPlans].map(p=>({...p,frame:localFrame(p.center)}));
export const LANDMARK_ROCKS={type:'FeatureCollection',features:plans.flatMap(p=>p.features)};
export const landmarkById=id=>LANDMARKS.find(p=>p.id===id);
export function landmarkColumns(plan,height){
 const result=[];
 for(const feature of plan.features.filter(f=>f.properties.kind==='cliff')){
  const line=feature.geometry.coordinates.map(plan.frame.toLocal);
  for(let j=1;j<line.length;j++){
   const a=line[j-1],b=line[j],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)continue;
   const n=Math.ceil(length/6),normal=[dy/length,-dx/length];
   for(let k=0;k<n;k++){const t=(k+.5)/n,x=a[0]+dx*t,y=a[1]+dy*t,i=result.length,crest=height(x,y),foot=height(x+normal[0]*9,y+normal[1]*9);result.push({x,y,normal,angle:Math.atan2(dy,dx),width:length/n+.35,depth:7+i%3,base:Math.min(crest,foot)-3,top:crest+plan.heightMeters+Math.sin(i*1.7)*4,index:i});}
  }
 }
 return result;
}
