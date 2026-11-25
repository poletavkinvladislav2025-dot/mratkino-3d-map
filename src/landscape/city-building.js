import {insideGeometry} from '../resort-scene-data.js';

export const CITY_BUILDINGS=new Set(['houses','cinema','palace','museum']);

export function buildingPolygons(features){
 return features.flatMap(feature=>{
  const {geometry}=feature;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return polygons.map(coordinates=>({feature,geometry:{type:'Polygon',coordinates}}));
 });
}

function nearestEdge(ring,point){
 let nearest=null;
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<.2)continue;
  const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(length*length)));
  const distance=Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy);
  if(!nearest||distance<nearest.distance)nearest={a,b,length,distance};
 }
 return nearest;
}

export function findCityBuilding(polygons,plan){
 const candidates=[];
 for(const {feature,geometry} of polygons){
  if(feature.id==null)continue;
  const rings=geometry.coordinates.map(r=>r.map(plan.frame.toLocal));
  const edge=nearestEdge(rings[0],[0,0]);
  if(!edge||edge.distance>8&&!insideGeometry(plan.center,geometry))continue;
  const xs=rings[0].map(p=>p[0]),ys=rings[0].map(p=>p[1]);
  if(Math.max(...xs)-Math.min(...xs)>110||Math.max(...ys)-Math.min(...ys)>110)continue;
  candidates.push({geometry,rings,properties:feature.properties,
   score:insideGeometry(plan.center,geometry)?-1:edge.distance});
 }
 const result=candidates.sort((a,b)=>a.score-b.score)[0];
 if(!result)return null;
 const front=plan.facadeToward&&nearestEdge(result.rings[0],plan.frame.toLocal(plan.facadeToward));
 return {...result,front:front?.length>=6?front:null,key:JSON.stringify(result.geometry.coordinates)};
}
