import geometry from './malinovaya-rocks.json' with {type:'json'};
import {localFrame} from '../resort-scene-data.js';
export const MALINOVAYA_ROCKS={center:[58.3158,54.0038],enter:14.4,exit:14.1,radiusKm:1.4};
export const ROCK_SURFACES=geometry;
export const rockFrame=localFrame(MALINOVAYA_ROCKS.center);
export function rockColumns(height){
 const line=geometry.features.find(f=>f.properties.kind==='cliff').geometry.coordinates.map(rockFrame.toLocal),columns=[];
 for(let j=1;j<line.length;j++){
  const [a,b]=[line[j-1],line[j]],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),count=Math.ceil(length/6),normal=[dy/length,-dx/length];
  for(let k=0;k<count;k++){const t=(k+.5)/count,x=a[0]+dx*t,y=a[1]+dy*t,i=columns.length,crest=height(x,y),foot=height(x+normal[0]*9,y+normal[1]*9),top=crest+15+Math.sin(i*1.7)*5+(i%7===0?7:0);columns.push({x,y,normal,angle:Math.atan2(dy,dx),width:length/count+.35,depth:7+(i%3),base:Math.min(crest,foot)-3,top,index:i});}
 }
 return columns;
}
