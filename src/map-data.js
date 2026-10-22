export const SUMMIT=[58.4371909,53.9974603];
export const EXPECTED={south:['Ю1','Ю2','Ю3','Ю4'],north:['С1','С2','С3']};
export const EMPTY={type:'FeatureCollection',features:[]};
export function coordinates(geometry){
 const result=[];const walk=v=>{if(typeof v[0]==='number')result.push(v.slice(0,2));else v.forEach(walk);};walk(geometry.coordinates);return result;
}
export function boundsFor(features){
 const points=features.flatMap(f=>coordinates(f.geometry));if(!points.length)return null;
 return [[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]];
}
export function bearingBetween(a,b){
 const rad=Math.PI/180;const dl=(b[0]-a[0])*rad,la=a[1]*rad,lb=b[1]*rad;
 return Math.atan2(Math.sin(dl)*Math.cos(lb),Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dl))/rad;
}
export function slopeCamera(features,view){
 const lines=features.filter(f=>f.properties.slope===view&&f.geometry.type==='LineString'&&/^[ЮС][1-5]$/.test(f.properties.name));
 const bounds=boundsFor(lines);if(!bounds)return null;
 // A slope's bottom is its end farthest from the independently located summit.
 const bottoms=lines.map(f=>{const a=f.geometry.coordinates[0],b=f.geometry.coordinates.at(-1);const d=p=>Math.hypot((p[0]-SUMMIT[0])*Math.cos(SUMMIT[1]*Math.PI/180),p[1]-SUMMIT[1]);return d(a)>d(b)?a:b;});
 const base=bottoms.reduce((sum,p)=>[sum[0]+p[0]/bottoms.length,sum[1]+p[1]/bottoms.length],[0,0]);
 return {bounds,bearing:bearingBetween(base,SUMMIT),pitch:61,base,basis:'bearing from mapped trail bottoms toward OSM summit; bounds of named OSM lines'};
}
export function createStyle(data,demURL,forestURL){
 const dem={type:'raster-dem',tiles:[demURL],tileSize:256,encoding:'terrarium',minzoom:10,maxzoom:14,bounds:data.manifest.terrain_bounds,attribution:'<a href="https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM" target="_blank" rel="noopener">Copernicus DEM</a>'};
 const sources={dem:{...dem},shade:{...dem}};
 const [west,south,east,north]=data.manifest.bounds;
 if(forestURL)sources['forest-winter']={type:'image',url:forestURL,coordinates:[[west,north],[east,north],[east,south],[west,south]]};
 for(const name of ['trails','lifts','stations','forest','roads','facilities','contours'])sources[name]={type:'geojson',data:data[name]||EMPTY,promoteId:'id',attribution:name==='trails'?'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors · ODbL</a>':''};
 return {version:8,sources,terrain:{source:'dem',exaggeration:1},sky:{'sky-color':'#e7f0f5','horizon-color':'#f7faf7','fog-color':'#e4ecee','fog-ground-blend':0.4},layers:[
  {id:'snow',type:'background',paint:{'background-color':'#e5ecee'}},
  {id:'forest',type:'fill',source:'forest',paint:{'fill-color':'#476f69','fill-opacity':forestURL?0:0.52,'fill-antialias':true}},
  ...(forestURL?[{id:'forest-soft',type:'raster',source:'forest-winter',paint:{'raster-opacity':1,'raster-fade-duration':0}}]:[]),
  {id:'road',type:'line',source:'roads',paint:{'line-color':'#ced5c9','line-opacity':0.65,'line-width':['interpolate',['linear'],['zoom'],12,0.5,16,2]}},
  {id:'trail-area',type:'fill',source:'trails',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#f8fafb','fill-opacity':0.22}},
  {id:'hillshade',type:'hillshade',source:'shade',paint:{'hillshade-shadow-color':'#344f69','hillshade-highlight-color':'#ffffff','hillshade-accent-color':'#718a9f','hillshade-method':'igor','hillshade-exaggeration':0.75,'hillshade-illumination-altitude':40,'hillshade-illumination-direction':315,'hillshade-illumination-anchor':'map'}},
  {id:'contours',type:'line',source:'contours',layout:{visibility:'none'},paint:{'line-color':'#718778','line-width':0.65,'line-opacity':0.35}},
  {id:'facility-buildings',type:'fill',source:'facilities',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'fill-color':'#b0b4a8','fill-opacity':0.28}},
  {id:'facility-points',type:'circle',source:'facilities',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':['interpolate',['linear'],['zoom'],12,0,15,2.5],'circle-color':'#71866b','circle-stroke-width':1,'circle-stroke-color':'#ffffff'}},
  {id:'trail-area-edge',type:'line',source:'trails',filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],paint:{'line-color':'#b9826a','line-width':1,'line-opacity':0}},
  {id:'trail-casing',type:'line',source:'trails',filter:['all',['in',['geometry-type'],['literal',['LineString','MultiLineString']]],['!=',['get','id'],'way/933862767']],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fffdf8','line-width':7,'line-opacity':0.9}},
  {id:'trail-line',type:'line',source:'trails',filter:['all',['in',['geometry-type'],['literal',['LineString','MultiLineString']]],['!=',['get','id'],'way/933862767']],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['case',['==',['get','difficulty_verified'],true],['match',['get','difficulty_osm'],'novice','#399b6b','easy','#3785b8','intermediate','#cd554e','advanced','#252e34','#bd775b'],'#bd775b'],'line-width':3,'line-opacity':0.95}},
  {id:'lift-casing',type:'line',source:'lifts',paint:{'line-color':'#fff','line-width':5,'line-opacity':0.8}},
  {id:'lift-line',type:'line',source:'lifts',paint:{'line-color':'#665c8d','line-width':2.2,'line-dasharray':[2,2]}},
  {id:'lift-stations',type:'circle',source:'stations',filter:['==',['get','aerialway',['get','tags']],'station'],paint:{'circle-radius':5,'circle-color':'#665c8d','circle-stroke-width':2,'circle-stroke-color':'#fff'}},
 ]};
}
