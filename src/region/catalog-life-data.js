import {localFrame} from '../resort-scene-data.js';
const empty=()=>({type:'FeatureCollection',features:[]});
const closed=p=>p.closed===true||p.animate===false||['closed','abandoned','disused'].includes(p.tags?.['piste:status'])||['no','private'].includes(p.tags?.access)||p.tags?.disused==='yes'||p.tags?.abandoned==='yes';
export const LIFT_TYPES=new Set(['chair_lift','gondola','cable_car','drag_lift','platter','t-bar','j-bar','rope_tow','magic_carpet']);
/** Only existing mapped downhill lines, without inventing pistes or operational status. */
export function catalogLifeData(place,catalog,mobile=false){
 const lines=category=>catalog.features.filter(f=>f.properties.category===category&&!closed(f.properties)).flatMap(f=>(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[]).filter(c=>c.length>1).map((coordinates,i)=>({...f,properties:{...f.properties,id:f.properties.id+'/'+i},geometry:{type:'LineString',coordinates}})));
 const trails=lines('ski'),lifts=lines('lift').filter(f=>LIFT_TYPES.has(f.properties.tags?.aerialway)).map(f=>({...f,properties:{...f.properties,seats:Math.max(1,Math.min(8,Number(f.properties.tags?.['aerialway:occupancy'])||1))}}));
 const budget=mobile?96:240,count=Math.min(mobile?14:36,Math.max(2,Math.floor(budget/Math.max(1,trails.length))));
 return {data:{trails:{type:'FeatureCollection',features:trails},lifts:{type:'FeatureCollection',features:lifts},facilities:empty(),stations:empty()},profile:{id:'catalog-life',center:place.coordinates,forest:false,saplings:false,seatsFromSource:true,maxAnimatedPassengers:2,centerlineOnly:true,corridorHalfWidth:3,sampledGround:true,ridersPerSegment:{desktop:count,mobile:count},vehicleCounts:{chair:mobile?8:16,drag:mobile?5:10},...localFrame(place.coordinates)}};
}
