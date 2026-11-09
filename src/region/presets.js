import {BUZHD_POINTS,BUZHD_BOUNDS,BUZHD_HISTORY} from './buzhd.js';
import {DIRECTION_PLACES,DIRECTION_ROUTES} from './directions.js';
import {rodeoPlan,rodeoFrame} from '../landscape/rodeo-plan.js';
import {content} from './card-content.js';
import registry from './places.json' with {type:'json'};
import winter from './winter-places.json' with {type:'json'};
import {ethnopark as ethno} from '../landscape/ethnopark-settings.js';
import {mergeSourcePlaces,aliasesFor} from './passport.js';
const descriptions={mratkino:'Горнолыжный центр в Белорецке с трассами на южном и северном склонах. С верхних участков открываются виды на город и горы Южного Урала.',abzakovo:'Горнолыжный курорт возле Новоабзаково с лесными спусками, учебными участками и спортивными трассами. Рядом расположен биатлонный комплекс.'};
const existingPlaces=mergeSourcePlaces([...registry.map(p=>({...p,description:descriptions[p.id]||p.description})),...winter.map(p=>p.id==='ethnopark'?{...p,name:ethno.name,description:ethno.description,coordinates:ethno.center,sourceUrl:ethno.sourceUrl,photo:ethno.photo,photoCredit:ethno.photoCredit}:p)]).map(p=>({...p,...content.places[p.id],...(p.id==='narrowGauge2'?{railwayIcon:'steam',railwayColor:'#B08D57'}:{})}));
const additions=DIRECTION_PLACES.filter(p=>!existingPlaces.some(e=>e.id===p.mapPlaceId)).map(p=>{const route=DIRECTION_ROUTES.find(r=>r.id===p.defaultRouteId),point=route?.points.find(x=>x.role==='goal')||route?.points[0];return point?{id:p.mapPlaceId,name:({'bolshoy-shatak':'Большой Шатак',vishnevaya:'Вишнёвая'})[p.placeId]||route.title,kind:'peak',coordinates:point.coordinates,zoneRadiusKm:2,major:false,description:p.placeId==='bolshoy-shatak'?'Двухдневный поход по хребту. Конец опубликованного трека и отдельный маркер вершины показаны раздельно.':'Пеший маршрут: линия и точки уточняются.',stampAvailable:p.stampAvailable}:null;}).filter(Boolean);
const railwayPlaces=BUZHD_POINTS.filter(p=>p.id!=='gr231').map(p=>({...p,kind:'heritage',zoneRadiusKm:0,major:false,sourceUrl:BUZHD_HISTORY,url:BUZHD_HISTORY,railwayIcon:p.icon,railwayColor:p.color,coordinateStatus:'owner-supplied-20261109',...content.places[p.id]}));
export const PLACES=[...existingPlaces,...additions.map(p=>({...p,...content.places[p.id]})),...railwayPlaces,{id:'buzhd',name:'Белорецкая узкоколейка (БУЖД)',kind:'heritage',coordinates:[(BUZHD_BOUNDS[0][0]+BUZHD_BOUNDS[1][0])/2,(BUZHD_BOUNDS[0][1]+BUZHD_BOUNDS[1][1])/2],zoneRadiusKm:0,major:false,sourceUrl:BUZHD_HISTORY,url:BUZHD_HISTORY,...content.places.buzhd,description:'Бывшая узкоколейная железная дорога Белорецка и окрестностей. На карте показаны сохранившиеся в OpenStreetMap фрагменты полотна. Рельсы сняты; сейчас по полотну идут грунтовки. Паровозы на карте — условная историческая анимация, а не действующее движение поездов.'}];
export const PLACE_ALIASES={...aliasesFor(PLACES),gr231:'narrowGauge2'};
export const canonicalPlaceId=id=>Object.hasOwn(PLACE_ALIASES,id)?PLACE_ALIASES[id]:id;
// A stable local welcome view, independent of distant places or full GPX bounds.
export const REGION_BOUNDS=[[58.25,53.75],[58.72,54.07]];
export const CITY={id:'beloretsk',name:'Белорецк',kind:'city',...content.places.beloretsk,coordinates:[58.4099549,53.9680705],zoneRadiusKm:10};
export const byId=id=>id==='beloretsk'?CITY:PLACES.find(p=>p.id===canonicalPlaceId(id));
export function presetFor(id){
 const place=byId(id);
 if(place)id=place.id;
 if(id==='all')return {id,center:[58.485,53.91],zoom:10.3,pitch:35,bearing:0,layers:{labels:true,forest:true,paths:false},data:[],bounds:REGION_BOUNDS};
 if(!place)return presetFor('mratkino');
 if(id==='buzhd')return {id,center:place.coordinates,zoom:9,pitch:35,bearing:0,bounds:BUZHD_BOUNDS};
 if(id==='rodeo'){const park=rodeoPlan();return {id,center:rodeoFrame.toLngLat(park.point(0,park.length/2)),zoom:16,pitch:55,bearing:-125};}
 if(id==='narrowGauge2')return {id,center:place.coordinates,zoom:19.5,mobileZoom:19,pitch:62,bearing:40};
 if(id==='moose')return {id,center:place.coordinates,zoom:19.5,mobileZoom:19.1,pitch:64,bearing:145};
 if(['malinovaya-2','malinovaya-3'].includes(id))return {id,center:place.coordinates,zoom:16.1,mobileZoom:15.8,pitch:62,bearing:35};
 if(id==='waterTower')return {id,center:place.coordinates,zoom:19.3,mobileZoom:18.2,pitch:64,bearing:20};
 if(id==='ethnopark')return {id,center:place.coordinates,zoom:18.1,pitch:58,bearing:ethno.bearing};
 const city=id==='beloretsk',resort=id==='mratkino',abzakovo=id==='abzakovo';
 const urban=place.kind==='stamp-point'||place.kind==='heritage';
 return {id,center:place.coordinates,zoom:city?12.2:resort?14.7:abzakovo?14.5:urban?18:12.6,pitch:city?4:urban?35:resort?61:57,bearing:city?0:urban?0:resort?0:abzakovo?-70:-25,layers:{labels:!city,forest:true,paths:false},data:resort?['mratkino']:abzakovo?['abzakovo']:['zone:'+id]};
}
export function distanceKm(a,b){const r=Math.PI/180,dl=(b[0]-a[0])*r,dp=(b[1]-a[1])*r;return 12742.0176*Math.asin(Math.min(1,Math.sqrt(Math.sin(dp/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dl/2)**2)));}
export function activeZones(center,zoom){
 if(zoom<11.5)return [];
 return [...PLACES,CITY].filter(p=>distanceKm(center,p.coordinates)<=p.zoneRadiusKm).sort((a,b)=>distanceKm(center,a.coordinates)-distanceKm(center,b.coordinates)).slice(0,4);
}
