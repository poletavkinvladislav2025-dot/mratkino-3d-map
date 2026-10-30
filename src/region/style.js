import {hikingColorExpression} from './route-colors.js';
import {ROCK_SURFACES} from '../landscape/malinovaya-rock-plan.js';
import {createStyle,EMPTY,boundsFor} from '../map-data.js';
import {PLACES} from './presets.js';
import {addLongDistanceLayers} from './long-distance.js';
import {skiColorExpression} from './ski-colors.js';
export const REGION_DEM='https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
export const BASEMAP_URL='https://tiles.openfreemap.org/planet';
// Keep the detailed facility layer within the actual resort, even when the city is in view.
export function resortFacilities(data){
 const bounds=boundsFor(data.trails.features.filter(f=>f.geometry.type==='LineString'&&/^[ЮС][1-4]$/.test(f.properties.name)));
 if(!bounds)return EMPTY;
 const [[w,s],[e,n]]=bounds,latMargin=.0018,lngMargin=.003;
 return {type:'FeatureCollection',features:data.facilities.features.filter(f=>{const box=boundsFor([f]);return box&&box[1][0]>=w-lngMargin&&box[0][0]<=e+lngMargin&&box[1][1]>=s-latMargin&&box[0][1]<=n+latMargin;})};
}
export function createRegionalStyle(data,forestURL,url=path=>path){
 const style=createStyle(data,REGION_DEM,forestURL);
 style.glyphs='https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
 style.layers.find(l=>l.id==='snow').paint['background-color']='#edf2ec';
 Object.assign(style.layers.find(l=>l.id==='hillshade').paint,{'hillshade-shadow-color':'#607773','hillshade-accent-color':'#899a90','hillshade-exaggeration':.58});
 for(const id of ['trail-line','trail-area','trail-area-edge'])style.layers.find(l=>l.id===id).paint[id==='trail-area'?'fill-color':'line-color']=['coalesce',['get','displayColor'],'#758079'];
 style.layers.find(l=>l.id==='trail-line').paint['line-width']=['interpolate',['linear'],['zoom'],11,2.4,17,4.5];
 style.layers.find(l=>l.id==='trail-area').paint['fill-opacity']=.12;
 for(const id of ['trail-line','trail-casing'])style.layers.find(l=>l.id===id).paint['line-opacity']=['interpolate',['linear'],['zoom'],10,.15,11,.95];
 style.sources.facilities.data=resortFacilities({...data,trails:data.trails||EMPTY,facilities:data.facilities||EMPTY});
 const dem={type:'raster-dem',tiles:[REGION_DEM],tileSize:512,encoding:'terrarium',minzoom:0,maxzoom:12,attribution:'<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn</a>'};
 style.sources.dem={...dem};style.sources.shade={...dem};
 style.sources.basemap={type:'vector',url:BASEMAP_URL,attribution:'<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · © OpenMapTiles · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>'};
 style.sources['malinovaya-rocks']={type:'geojson',data:ROCK_SURFACES};
 style.sources['region-places']={type:'geojson',data:{type:'FeatureCollection',features:PLACES.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:p.coordinates},properties:{id:p.id,name:p.name,major:p.major?1:0,kind:p.kind}}))}};
 style.sources['touring-routes']={type:'geojson',data:EMPTY};
 style.sources['route-stops']={type:'geojson',data:EMPTY};
 for(const id of ['winter-catalog','hiking-routes','hiking-stops','nature-surfaces'])style.sources[id]={type:'geojson',data:EMPTY};
 for(const name of ['trails','lifts','stations','boundary','piste-areas'])style.sources['abzakovo-'+name]={type:'geojson',data:EMPTY};
 // Real building footprints only; detailed volume is enabled by the global effects control.
 const baseLayers=[
 {id:'region-surfaces',type:'fill',source:'basemap','source-layer':'landcover',filter:['!=',['get','class'],'wood'],paint:{'fill-color':['match',['get','class'],'grass','#d2d6bc','farmland','#d8d4b9','wetland','#a9beb2','ice','#e4ecea','rock','#b5b4a7','sand','#dcd2b7','#d9dfd1'],'fill-opacity':.48}},
 {id:'region-landuse',type:'fill',source:'basemap','source-layer':'landuse',paint:{'fill-color':'#ced4cd','fill-opacity':.24}},
 {id:'region-forest',type:'fill',source:'basemap','source-layer':'landcover',filter:['==',['get','class'],'wood'],paint:{'fill-color':'#567363','fill-opacity':['interpolate',['linear'],['zoom'],8,.65,14,.57]}},
 {id:'region-water',type:'fill',source:'basemap','source-layer':'water',paint:{'fill-color':'#2f7887','fill-opacity':.9}},
 {id:'region-rivers',type:'line',source:'basemap','source-layer':'waterway',paint:{'line-color':'#397f91','line-width':['interpolate',['linear'],['zoom'],8,.5,15,2],'line-opacity':.85}},
 {id:'region-road-casing',type:'line',source:'basemap','source-layer':'transportation',filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service']]],layout:{'line-join':'round'},paint:{'line-color':'#faf9f1','line-width':['interpolate',['linear'],['zoom'],8,1,12,3,16,9],'line-opacity':.9}},
 {id:'region-roads',type:'line',source:'basemap','source-layer':'transportation',filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service']]],layout:{'line-join':'round'},paint:{'line-color':['match',['get','class'],'primary','#b8a18c','secondary','#c1ae99','#b9bcb1'],'line-width':['interpolate',['linear'],['zoom'],8,.5,12,1.4,16,4],'line-opacity':.85}},
 {id:'region-paths',type:'line',source:'basemap','source-layer':'transportation',minzoom:12,filter:['in',['get','class'],['literal',['path','track']]],layout:{visibility:'none'},paint:{'line-color':'#a28c72','line-width':1.1,'line-dasharray':[2,3],'line-opacity':.7}}
 ];
 style.layers.splice(1,0,...baseLayers.slice(0,5));
 style.layers.splice(style.layers.findIndex(l=>l.id==='hillshade'),0,{id:'malinovaya-rock-surface',type:'fill',source:'malinovaya-rocks',minzoom:13.5,filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#9d9a89','fill-opacity':.65}});
 const hill=style.layers.findIndex(l=>l.id==='hillshade');style.layers.splice(hill+1,0,...baseLayers.slice(5));
 // Hide the specifically disputed freeride line, preserving every named piste and the source file.
 for(const id of ['trail-line','trail-casing'])style.layers.find(l=>l.id===id).filter=['all',['==',['geometry-type'],'LineString'],['!=',['get','id'],'way/933862767']];
 // Forest source already provides the continuous regional surface. Raster mask refines the resort only.
 style.layers.find(l=>l.id==='road').layout={visibility:'none'};
 style.layers.push(
 {id:'winter-catalog-casing',type:'line',source:'winter-catalog',minzoom:10,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fffdf7','line-width':['interpolate',['linear'],['zoom'],10,4,16,7]}},
 {id:'winter-catalog-line',type:'line',source:'winter-catalog',minzoom:10,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','displayColor'],'line-width':['interpolate',['linear'],['zoom'],10,['case',['==',['get','selected'],true],3,1.7],16,['case',['==',['get','selected'],true],6,3.5]],'line-dasharray':['case',['==',['get','category'],'lift'],['literal',[3,2]],['literal',[1,0]]] }},
 {id:'abzakovo-boundary',type:'line',source:'abzakovo-boundary',layout:{visibility:'none'},paint:{'line-color':'#748b7c','line-width':1,'line-dasharray':[4,5],'line-opacity':.65}},
 {id:'abzakovo-piste-fill',type:'fill',source:'abzakovo-piste-areas',layout:{visibility:'none'},paint:{'fill-color':skiColorExpression(),'fill-opacity':.12}},
 {id:'abzakovo-trail-shadow',type:'line',source:'abzakovo-trails',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#20372f','line-width':10,'line-opacity':.65,'line-blur':1}},
 {id:'abzakovo-trail-casing',type:'line',source:'abzakovo-trails',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':7.5}},
 {id:'abzakovo-trail-line',type:'line',source:'abzakovo-trails',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':skiColorExpression(),'line-width':4.5,'line-opacity':1}},
 {id:'abzakovo-lift-line',type:'line',source:'abzakovo-lifts',layout:{visibility:'none','line-cap':'round'},paint:{'line-color':'#806b9e','line-width':2.4,'line-dasharray':[3,2],'line-opacity':.95}},
 {id:'abzakovo-stations',type:'circle',source:'abzakovo-stations',layout:{visibility:'none'},paint:{'circle-radius':['match',['get','kind'],'pylon',2,3.5],'circle-color':'#806b9e','circle-stroke-color':'#fff','circle-stroke-width':1}},
 {id:'nature-open',type:'fill',source:'nature-surfaces',filter:['all',['==',['geometry-type'],'Polygon'],['in',['get','kind'],['literal',['bare_rock','scree','grassland','heath','scrub','clearing']]]],paint:{'fill-color':['match',['get','kind'],'bare_rock','#a79e89','scree','#b5ab97','grassland','#b5bd8f','heath','#abb38b','scrub','#829776','#c8c9a5'],'fill-opacity':.75}},
 {id:'nature-rock-edge',type:'line',source:'nature-surfaces',filter:['in',['get','kind'],['literal',['bare_rock','scree','cliff']]],paint:{'line-color':'#736e61','line-width':['interpolate',['linear'],['zoom'],14,.6,18,1.6],'line-opacity':.6}},
 {id:'hiking-route-casing',type:'line',source:'hiking-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-offset':['coalesce',['get','renderOffset'],0],'line-color':'#fffdf4','line-width':4.5,'line-opacity':.95}},
 {id:'hiking-route-line',type:'line',source:'hiking-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-offset':['coalesce',['get','renderOffset'],0],'line-color':hikingColorExpression,'line-width':['case',['==',['get','selected'],true],3.5,2.8],'line-dasharray':[3,1]}},
 {id:'hiking-route-stops',type:'circle',minzoom:13.2,source:'hiking-stops',paint:{'circle-color':['match',['get','role'],'start','#2d7054','start-finish','#2d7054','finish','#a74d2f','#877747'],'circle-radius':5,'circle-stroke-color':'#fff','circle-stroke-width':2}},
 {id:'touring-route-casing',type:'line',source:'touring-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':7}},
 {id:'touring-route-line',type:'line',source:'touring-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#b66542','line-width':3.2}},
 {id:'touring-route-stops',type:'circle',source:'route-stops',paint:{'circle-color':'#b66542','circle-radius':5,'circle-stroke-color':'#fff','circle-stroke-width':2}}
 );
 // Existing points stay markers. Volumes use actual OpenMapTiles building polygons,
 // render heights when present, otherwise a modest illustrative 6 m height.
 style.layers.push({id:'region-buildings-3d',type:'fill-extrusion',source:'basemap','source-layer':'building',minzoom:13,layout:{visibility:'none'},paint:{'fill-extrusion-color':'#c8c2ad','fill-extrusion-height':['max',1,['to-number',['coalesce',['get','render_height'],['get','height'],6],6]],'fill-extrusion-base':['max',0,['to-number',['coalesce',['get','render_min_height'],['get','min_height'],0],0]],'fill-extrusion-opacity':.92,'fill-extrusion-vertical-gradient':true}});
 style.layers.push({id:'stamp-geographic-anchors',type:'circle',source:'region-places',minzoom:14,filter:['==',['get','kind'],'stamp-point'],paint:{'circle-radius':3,'circle-color':'#b16b3e','circle-stroke-color':'#fff','circle-stroke-width':1}});
 // Surface colours receive the existing geographic hillshade instead of covering its shadows.
 const naturalSurface=style.layers.splice(style.layers.findIndex(l=>l.id==='nature-open'),1)[0];style.layers.splice(style.layers.findIndex(l=>l.id==='hillshade'),0,naturalSurface);
 Object.assign(style.layers.find(l=>l.id==='region-forest').paint,{'fill-color':'#456a54','fill-opacity':['interpolate',['linear'],['zoom'],8,.76,14,.67]});
 style.layers.find(l=>l.id==='region-surfaces').paint['fill-opacity']=.60;
 Object.assign(style.layers.find(l=>l.id==='region-water').paint,{'fill-color':'#286d73','fill-opacity':.94});
 Object.assign(style.layers.find(l=>l.id==='region-roads').paint,{'line-color':['match',['get','class'],'motorway','#9b846a','trunk','#9b846a','primary','#a18c70','secondary','#ad9b7f','tertiary','#b8aa92','#bdc7bb'],'line-width':['interpolate',['linear'],['zoom'],8,.6,12,1.8,16,['match',['get','class'],'primary',6,'secondary',5,'tertiary',4,2.6]]});
 style.layers.push(
  {id:'region-shore',type:'line',source:'basemap','source-layer':'water',paint:{'line-color':'#407a78','line-width':.8,'line-opacity':.65}},
  {id:'region-town-names',type:'symbol',source:'basemap','source-layer':'place',minzoom:8,filter:['in',['get','class'],['literal',['city','town','village','hamlet']]],layout:{'text-field':['coalesce',['get','name:ru'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],8,11,14,15],'text-padding':18,'symbol-sort-key':['coalesce',['get','rank'],20]},paint:{'text-color':'#294f3c','text-halo-color':'#f9fbf2','text-halo-width':1.8}},
  {id:'region-street-names',type:'symbol',source:'basemap','source-layer':'transportation_name',minzoom:14,filter:['any',['in',['get','class'],['literal',['primary','secondary','tertiary','minor','service']]],['==',['get','subclass'],'pedestrian']],layout:{'symbol-placement':'line','symbol-spacing':260,'text-field':['coalesce',['get','name:ru'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':11,'text-padding':6,'text-max-angle':35},paint:{'text-color':'#53654f','text-halo-color':'#fafbf5','text-halo-width':1.6}}
 );
 addLongDistanceLayers(style,url);
 return style;
}
