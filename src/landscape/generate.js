import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
import {LANDSCAPE} from './config.js';
import {WORLD,project,unproject,hash,inside,near,mapGeometry,geometryBounds,inBox} from './spatial.js';
export function decodeLandscape(buffer,cell){
 const tile=new VectorTile(new Pbf(new Uint8Array(buffer))),woods=[],obstacles=[],surfaces=[],counts={};
 for(const name of ['landcover','landuse','water','waterway','building','transportation']){
  const layer=tile.layers[name];counts[name]=layer?.length||0;if(!layer)continue;
  for(let i=0;i<layer.length;i++){
   const raw=layer.feature(i),feature=raw.toGeoJSON(cell.x,cell.y,cell.z),p=feature.properties,g=mapGeometry(feature.geometry,project),entry={geometry:g,bounds:geometryBounds(g)};
   if(name==='landcover'&&p.class==='wood'){const leaf=p.leaf_type||p.subclass;woods.push({...entry,type:/needle|conifer/.test(leaf)?0:/broad|deciduous/.test(leaf)?1:/mixed/.test(leaf)?2:3});}
   else if(name==='water'||name==='building'||name==='landcover'&&['rock','ice','bare_rock','scree','glacier','wetland'].includes(p.class))obstacles.push({...entry,width:3});
   else if(name==='waterway')obstacles.push({...entry,width:5});
   else if(name==='transportation')obstacles.push({...entry,width:LANDSCAPE.roads[p.class]||2});
   if(name==='landcover')surfaces.push({class:p.class,subclass:p.subclass||null});
  }
 }
 const size=WORLD/2**cell.z,spacing=LANDSCAPE.treeSpacing,points=[];let rejected=0;
 // World grid IDs own a point exactly once, regardless of tile buffers, clipping and LOD.
 for(let ix=Math.floor(cell.x*size/spacing);ix<=Math.ceil((cell.x+1)*size/spacing);ix++)for(let iy=Math.floor(cell.y*size/spacing);iy<=Math.ceil((cell.y+1)*size/spacing);iy++){
  const seed=hash(ix,iy),p=[(ix+.15+(seed%700)/1000)*spacing,(iy+.15+((seed>>>10)%700)/1000)*spacing];
  if(p[0]<cell.x*size||p[0]>=(cell.x+1)*size||p[1]<cell.y*size||p[1]>=(cell.y+1)*size)continue;
  const wood=woods.find(w=>inBox(p,w.bounds)&&inside(p,w.geometry));if(!wood)continue;
  const ll=unproject(p),scale=1/Math.cos(ll[1]*Math.PI/180);
  if(obstacles.some(o=>inBox(p,o.bounds,(o.width+3)*scale)&&near(p,o.geometry,(o.width+3)*scale))){rejected++;continue;}
  points.push([ll[0],ll[1],seed,wood.type]);
 }
 return {id:cell.id,points,counts,rejected,surfaces,bytes:buffer.byteLength,forestPolygons:woods.length};
}
