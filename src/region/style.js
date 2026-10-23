import {createStyle,EMPTY,boundsFor} from '../map-data.js';
import {PLACES} from './presets.js';
export const REGION_DEM='https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
export const BASEMAP_URL='https://tiles.openfreemap.org/planet';
// Keep the detailed facility layer within the actual resort, even when the city is in view.
export function resortFacilities(data){
 const bounds=boundsFor(data.trails.features.filter(f=>f.geometry.type==='LineString'&&/^[ЮС][1-4]$/.test(f.properties.name)));
 if(!bounds)return EMPTY;
 const [[w,s],[e,n]]=bounds,latMargin=.0018,lngMargin=.003;
 return {type:'FeatureCollection',features:data.facilities.features.filter(f=>{const box=boundsFor([f]);return box&&box[1][0]>=w-lngMargin&&box[0][0]<=e+lngMargin&&box[1][1]>=s-latMargin&&box[0][1]<=n+latMargin;})};
}
export function createRegionalStyle(data,forestURL){
 const style=createStyle(data,REGION_DEM,forestURL);
 style.sources.facilities.data=resortFacilities({...data,trails:data.trails||EMPTY,facilities:data.facilities||EMPTY});
 const dem={type:'raster-dem',tiles:[REGION_DEM],tileSize:512,encoding:'terrarium',minzoom:0,maxzoom:12,attribution:'<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn</a>'};
 style.sources.dem={...dem};style.sources.shade={...dem};
 style.sources.basemap={type:'vector',url:BASEMAP_URL,attribution:'<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · © OpenMapTiles · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>'};
 style.sources['region-places']={type:'geojson',data:{type:'FeatureCollection',features:PLACES.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:p.coordinates},properties:{id:p.id,name:p.name,major:p.major?1:0,kind:p.kind}}))}};
 style.sources['touring-routes']={type:'geojson',data:EMPTY};
 style.sources['route-stops']={type:'geojson',data:EMPTY};
 for(const id of ['hiking-routes','hiking-stops','nature-surfaces'])style.sources[id]={type:'geojson',data:EMPTY};
 for(const name of ['trails','lifts','stations','boundary'])style.sources['abzakovo-'+name]={type:'geojson',data:EMPTY};
 // No city labels, POIs or building layers. The same street geometry continues across the region.
 const baseLayers=[
 {id:'region-landuse',type:'fill',source:'basemap','source-layer':'landuse',paint:{'fill-color':'#ced4cd','fill-opacity':.24}},
 {id:'region-forest',type:'fill',source:'basemap','source-layer':'landcover',filter:['==',['get','class'],'wood'],paint:{'fill-color':'#567363','fill-opacity':['interpolate',['linear'],['zoom'],8,.65,14,.57]}},
 {id:'region-water',type:'fill',source:'basemap','source-layer':'water',paint:{'fill-color':'#a6c6ce','fill-opacity':.8}},
 {id:'region-rivers',type:'line',source:'basemap','source-layer':'waterway',paint:{'line-color':'#91b4c0','line-width':['interpolate',['linear'],['zoom'],8,.4,15,1.6],'line-opacity':.7}},
 {id:'region-road-casing',type:'line',source:'basemap','source-layer':'transportation',filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service']]],layout:{'line-join':'round'},paint:{'line-color':'#faf9f1','line-width':['interpolate',['linear'],['zoom'],8,1,12,3,16,9],'line-opacity':.9}},
 {id:'region-roads',type:'line',source:'basemap','source-layer':'transportation',filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service']]],layout:{'line-join':'round'},paint:{'line-color':['match',['get','class'],'primary','#b8a18c','secondary','#c1ae99','#b9bcb1'],'line-width':['interpolate',['linear'],['zoom'],8,.5,12,1.4,16,4],'line-opacity':.85}},
 {id:'region-paths',type:'line',source:'basemap','source-layer':'transportation',minzoom:12,filter:['in',['get','class'],['literal',['path','track']]],layout:{visibility:'none'},paint:{'line-color':'#a28c72','line-width':1.1,'line-dasharray':[2,3],'line-opacity':.7}}
 ];
 style.layers.splice(1,0,...baseLayers.slice(0,4));
 const hill=style.layers.findIndex(l=>l.id==='hillshade');style.layers.splice(hill+1,0,...baseLayers.slice(4));
 // Hide the specifically disputed freeride line, preserving every named piste and the source file.
 for(const id of ['trail-line','trail-casing'])style.layers.find(l=>l.id===id).filter=['all',['==',['geometry-type'],'LineString'],['!=',['get','id'],'way/933862767']];
 // Forest source already provides the continuous regional surface. Raster mask refines the resort only.
 style.layers.find(l=>l.id==='road').layout={visibility:'none'};
 style.layers.push(
 {id:'abzakovo-boundary',type:'line',source:'abzakovo-boundary',layout:{visibility:'none'},paint:{'line-color':'#748b7c','line-width':1,'line-dasharray':[4,5],'line-opacity':.65}},
 {id:'abzakovo-trail-casing',type:'line',source:'abzakovo-trails',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#fffdf7','line-width':6}},
 {id:'abzakovo-trail-line',type:'line',source:'abzakovo-trails',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','difficultyOsm'],'novice','#58946c','easy','#4f87b8','intermediate','#bd6555','advanced','#404750','#91836c'],'line-width':3,'line-opacity':.95}},
 {id:'abzakovo-lift-line',type:'line',source:'abzakovo-lifts',layout:{visibility:'none','line-cap':'round'},paint:{'line-color':'#806b9e','line-width':2.4,'line-dasharray':[3,2],'line-opacity':.95}},
 {id:'abzakovo-stations',type:'circle',source:'abzakovo-stations',layout:{visibility:'none'},paint:{'circle-radius':['match',['get','kind'],'pylon',2,3.5],'circle-color':'#806b9e','circle-stroke-color':'#fff','circle-stroke-width':1}},
 {id:'nature-open',type:'fill',source:'nature-surfaces',filter:['all',['==',['geometry-type'],'Polygon'],['in',['get','kind'],['literal',['bare_rock','scree','grassland','heath','scrub','clearing']]]],paint:{'fill-color':['match',['get','kind'],'bare_rock','#a79e89','scree','#b5ab97','grassland','#b5bd8f','heath','#abb38b','scrub','#829776','#c8c9a5'],'fill-opacity':.75}},
 {id:'nature-rock-edge',type:'line',source:'nature-surfaces',filter:['in',['get','kind'],['literal',['bare_rock','scree','cliff']]],paint:{'line-color':'#736e61','line-width':['interpolate',['linear'],['zoom'],14,.6,18,1.6],'line-opacity':.6}},
 {id:'hiking-route-casing',type:'line',source:'hiking-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fffdf4','line-width':7,'line-opacity':.95}},
 {id:'hiking-route-line',type:'line',source:'hiking-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#a74d2f','line-width':3.2,'line-dasharray':[3,1]}},
 {id:'hiking-route-stops',type:'circle',source:'hiking-stops',paint:{'circle-color':['match',['get','role'],'start','#2d7054','start-finish','#2d7054','finish','#a74d2f','#877747'],'circle-radius':5,'circle-stroke-color':'#fff','circle-stroke-width':2}},
 {id:'touring-route-casing',type:'line',source:'touring-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':7}},
 {id:'touring-route-line',type:'line',source:'touring-routes',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#b66542','line-width':3.2}},
 {id:'touring-route-stops',type:'circle',source:'route-stops',paint:{'circle-color':'#b66542','circle-radius':5,'circle-stroke-color':'#fff','circle-stroke-width':2}}
 );
 // Surface colours receive the existing geographic hillshade instead of covering its shadows.
 const naturalSurface=style.layers.splice(style.layers.findIndex(l=>l.id==='nature-open'),1)[0];style.layers.splice(style.layers.findIndex(l=>l.id==='hillshade'),0,naturalSurface);
 return style;
}
