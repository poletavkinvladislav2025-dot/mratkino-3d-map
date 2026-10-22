import {distanceKm} from './presets.js';
export const EMPTY_ROUTES={type:'FeatureCollection',features:[]};
function validatePoint(p){if(!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)||(p.length>2&&!Number.isFinite(p[2]))||Math.abs(p[0])>180||Math.abs(p[1])>85.051129)throw Error('Некорректные координаты трека');return p.slice(0,3);}
export function normalizeRoutes(json){
 const input=json.type==='FeatureCollection'?json.features:json.type==='Feature'?[json]:[{type:'Feature',properties:{},geometry:json}];
 if(!Array.isArray(input)||input.length>300)throw Error('Слишком много объектов в файле');
 let pointCount=0;
 const features=[];
 for(const f of input){
  const g=f.geometry;if(!g)continue;
  if(!['LineString','MultiLineString','Point'].includes(g.type))continue;
  const lines=g.type==='MultiLineString'?g.coordinates:g.type==='LineString'?[g.coordinates]:[];
  const clean=lines.map(line=>{if(!Array.isArray(line)||line.length<2)throw Error('В линии должно быть не менее двух точек');pointCount+=line.length;if(pointCount>80000)throw Error('Трек слишком подробный: максимум 80 000 точек');return line.map(validatePoint);});
  const properties={name:String(f.properties?.name||'Импортированный трек').slice(0,160),source:'Файл пользователя · маршрут не проверен',verified:false};
  const duration=f.properties?.duration;if(typeof duration==='string')properties.duration=duration.slice(0,120);
  features.push({type:'Feature',properties,geometry:g.type==='Point'?{type:'Point',coordinates:validatePoint(g.coordinates)}:{type:g.type,coordinates:g.type==='LineString'?clean[0]:clean}});
 }
 if(!features.some(f=>f.geometry.type!=='Point'))throw Error('В файле нет линии маршрута');
 return {type:'FeatureCollection',features};
}
export function parseGPX(text,Parser=globalThis.DOMParser){
 const xml=new Parser().parseFromString(text,'application/xml');
 if(xml.querySelector('parsererror')||xml.documentElement.localName!=='gpx')throw Error('Не удалось прочитать GPX');
 const nodes=(element,name)=>[...element.getElementsByTagNameNS('*',name)];
 const point=node=>{const p=[Number(node.getAttribute('lon')),Number(node.getAttribute('lat'))],ele=nodes(node,'ele')[0];if(!node.hasAttribute('lon')||!node.hasAttribute('lat'))throw Error('В GPX пропущены координаты');if(ele&&ele.textContent.trim()!==''&&Number.isFinite(Number(ele.textContent)))p.push(Number(ele.textContent));return p;};
 const name=nodes(xml,'name')[0]?.textContent||'GPX-трек';
 const features=[...nodes(xml,'trkseg').map(seg=>({type:'Feature',properties:{name},geometry:{type:'LineString',coordinates:nodes(seg,'trkpt').map(point)}})),...nodes(xml,'rte').map(seg=>({type:'Feature',properties:{name},geometry:{type:'LineString',coordinates:nodes(seg,'rtept').map(point)}})),...nodes(xml,'wpt').map(node=>({type:'Feature',properties:{name:nodes(node,'name')[0]?.textContent||'Остановка'},geometry:{type:'Point',coordinates:point(node)}}))];
 return normalizeRoutes({type:'FeatureCollection',features});
}
export function routeMetrics(collection){
 let lengthKm=0,gain=0,elevated=true;const lines=collection.features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[]);
 for(const line of lines){for(let i=1;i<line.length;i++){lengthKm+=distanceKm(line[i-1],line[i]);if(!Number.isFinite(line[i-1][2])||!Number.isFinite(line[i][2]))elevated=false;else gain+=Math.max(0,line[i][2]-line[i-1][2]);}}
 return {lengthKm,gainM:elevated?Math.round(gain):null,start:lines[0]?.[0],end:lines.at(-1)?.at(-1),stops:collection.features.filter(f=>f.geometry.type==='Point').length,duration:collection.features.find(f=>f.properties?.duration)?.properties.duration||null};
}
export function routeEndpoints(collection){
 const {start,end}=routeMetrics(collection);return {type:'FeatureCollection',features:[...collection.features.filter(f=>f.geometry.type==='Point'),...[start,end].filter(Boolean).map((p,i)=>({type:'Feature',properties:{name:i?'Финиш':'Старт'},geometry:{type:'Point',coordinates:p}}))]};
}
