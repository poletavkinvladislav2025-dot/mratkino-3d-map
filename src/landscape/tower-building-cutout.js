import {insideGeometry} from '../resort-scene-data.js';
import {WATER_TOWER} from './water-tower-settings.js';
const states=new WeakMap();
/** OpenMapTiles groups many separate buildings into one MultiPolygon by height.
 * Hide the group and restore its other polygons, removing only the tower itself. */
export function towerBuildingParts(features,center=WATER_TOWER.center,cityPolygons=[]){
 const keys=new Set(cityPolygons.map(g=>JSON.stringify(g.coordinates)));
 const excluded=g=>!!(center&&insideGeometry(center,g))||keys.has(JSON.stringify(g.coordinates));
 const contains=f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates.some(coordinates=>excluded({type:'Polygon',coordinates})):excluded(f.geometry);
 const ids=[...new Set(features.filter(f=>f.id!=null&&contains(f)).map(f=>f.id))],selected=new Set(ids),seen=new Set(),restored=[];
 for(const f of features){if(!selected.has(f.id))continue;const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];
  for(const coordinates of polygons){const geometry={type:'Polygon',coordinates};if(excluded(geometry))continue;const key=JSON.stringify([f.id,coordinates]);if(seen.has(key))continue;seen.add(key);restored.push({type:'Feature',properties:{...f.properties},geometry});}
 }
 return {ids,data:{type:'FeatureCollection',features:restored}};
}
export function updateTowerBuildings(map,active,cityPolygons=[]){
 if(!map?.getLayer?.('region-buildings-3d')||!map.getSource('tower-building-context'))return;
 const old=states.get(map);if(!active&&!cityPolygons.length){if(old?.active){map.setFilter('region-buildings-3d',null);map.getSource('tower-building-context').setData({type:'FeatureCollection',features:[]});states.set(map,{active:false});}return;}
 const patch=towerBuildingParts(map.querySourceFeatures('basemap',{sourceLayer:'building'}),active?WATER_TOWER.center:null,cityPolygons),key=JSON.stringify(patch);
 if(old?.active&&old.key===key)return;
 map.getSource('tower-building-context').setData(patch.data);
 map.setFilter('region-buildings-3d',patch.ids.length?['!',['in',['id'],['literal',patch.ids]]]:null);
 states.set(map,{active:true,key});
}
