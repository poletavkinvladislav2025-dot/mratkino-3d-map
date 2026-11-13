import catalog from './direction-catalog.json' with {type:'json'};
import {directionPresentation} from './direction-presentation.js';
/** All records, including place-only entries kept so old page links still resolve to the place. */
export const ALL_DIRECTION_ROUTES=catalog.routes.map(directionPresentation);
export const DIRECTION_ROUTES=ALL_DIRECTION_ROUTES.filter(r=>!r.placeOnly);
/** Former route ids whose place is reached by road: open the place instead of an empty route. */
export const PLACE_ONLY_ROUTES=Object.fromEntries(ALL_DIRECTION_ROUTES.filter(r=>r.placeOnly).map(r=>[r.id,r.mapPlaceId]));
export const DIRECTION_PLACES=catalog.places;
export const directionRoute=id=>DIRECTION_ROUTES.find(r=>r.id===id||r.aliases.includes(id));
export const directionPlace=id=>DIRECTION_PLACES.find(p=>p.placeId===id||p.mapPlaceId===id);
export const defaultDirectionRoute=id=>directionRoute(directionPlace(id)?.defaultRouteId);
export const routeStatus=r=>r.buildStatus==='ready'?'':r.geometrySource==='schematic_control_points'?'Схема по точкам':r.buildStatus==='partial'?'Маршрут неполный':'Линия пока не подтверждена';
export function directionFeatures(data,routes,selected){const ids=new Set(routes.map(r=>r.id)),id=directionRoute(selected)?.id;return {type:'FeatureCollection',features:data.features.filter(f=>ids.has(f.properties.routeId)).map(f=>({...f,properties:{...f.properties,selected:f.properties.routeId===id,dimmed:!!id&&f.properties.routeId!==id}}))};}
export function directionPadding(width,height,panelWidth=0,panelHeight=0){return width<=760?{top:64,left:44,right:44,bottom:Math.min(Math.max(44,panelHeight+24),height*.48)}:{top:64,left:52,right:Math.min(Math.max(52,panelWidth+110),width*.48),bottom:52};}
