"""Decorative pines and estimated riding areas; original Abzakovo lines stay untouched."""
import hashlib, json, math, pathlib, struct, xml.etree.ElementTree as ET
import numpy as np
import requests, mapbox_vector_tile, shapely
from PIL import Image
from pyproj import Transformer
from shapely.geometry import Point, Polygon, LineString, shape, mapping
from shapely.ops import transform, unary_union

ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/abzakovo';OUT=ROOT/'public/region/abzakovo'
def read(name):return json.loads((OUT/name).read_text())
def dump(name,value):(OUT/name).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
def feature(geometry,**properties):return {'type':'Feature','geometry':mapping(geometry),'properties':properties}
def collection(features):return {'type':'FeatureCollection','features':features}
def cached(path,url):
 if not path.exists():
  r=requests.get(url,timeout=60);r.raise_for_status();path.write_bytes(r.content)
 return {'url':url,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
def tile_xy(lon,lat,z):return (int((lon+180)/360*2**z),int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z))

def main():
 manifest=read('manifest.json');origin=manifest['center'];lon0,lat0=origin
 crs=f'+proj=aeqd +lat_0={lat0} +lon_0={lon0} +datum=WGS84 +units=m'
 project=Transformer.from_crs(4326,crs,always_xy=True).transform
 inverse=Transformer.from_crs(crs,4326,always_xy=True).transform
 mercator=Transformer.from_crs(3857,crs,always_xy=True).transform
 disk=Point(0,0).buffer(1999.9,quad_segs=90)
 root=ET.parse(RAW/'osm-map.xml').getroot()
 nodes={n.get('id'):(float(n.get('lon')),float(n.get('lat'))) for n in root.findall('node')}
 woods=[];obstacles=[];osm_woods=[]
 for w in root.findall('way'):
  tags={t.get('k'):t.get('v') for t in w.findall('tag')};refs=[n.get('ref') for n in w.findall('nd')]
  if len(refs)<2 or not all(n in nodes for n in refs):continue
  line=transform(project,LineString([nodes[n] for n in refs]))
  if not line.intersects(disk):continue
  if tags.get('highway'):obstacles.append(line.buffer(9 if tags['highway'] in ['primary','secondary','tertiary'] else 4))
  if tags.get('waterway'):obstacles.append(line.buffer(5))
  if refs[0]!=refs[-1] or len(refs)<4:continue
  polygon=transform(project,Polygon([nodes[n] for n in refs]));polygon=shapely.make_valid(polygon)
  if tags.get('natural')=='wood' or tags.get('landuse')=='forest':woods.append(polygon);osm_woods.append('way/'+w.get('id'))
  if tags.get('natural')=='water' or tags.get('water'):obstacles.append(polygon.buffer(3))
 # The same landcover used by the basemap completes large, partially exported OSM relations.
 template=json.loads((ROOT/'data/region/openfreemap-tilejson.json').read_text())['tiles'][0]
 w,s,e,n=manifest['bounds'];x1,y1=tile_xy(w,n,13);x2,y2=tile_xy(e,s,13);vector_sources=[]
 for x in range(x1,x2+1):
  for y in range(y1,y2+1):
   path=RAW/f'wood-13-{x}-{y}.pbf';url=template.replace('{z}','13').replace('{x}',str(x)).replace('{y}',str(y));vector_sources.append(cached(path,url))
   data=mapbox_vector_tile.decode(path.read_bytes(),default_options={'y_coord_down':True}).get('landcover',{});extent=data.get('extent',4096)
   def tile_project(px,py,z=None):return mercator(((x+px/extent)/8192-.5)*40075016.68557849,(.5-(y+py/extent)/8192)*40075016.68557849)
   for f in data.get('features',[]):
    if f['properties'].get('class')=='wood':woods.append(shapely.make_valid(transform(tile_project,shape(f['geometry']))))
 forest=unary_union(woods).intersection(disk)
 buildings=unary_union([transform(project,shape(f['geometry'])) for f in read('facilities.geojson')['features']])
 lift_lines=unary_union([transform(project,shape(f['geometry'])) for f in read('lifts.geojson')['features']])
 obstacles.extend([buildings.buffer(5),lift_lines.buffer(4)])
 blocked=unary_union(obstacles).intersection(disk)
 clear=disk.difference(unary_union([forest,blocked]))
 areas=[];local_areas=[]
 for f in read('trails.geojson')['features']:
  line=transform(project,shape(f['geometry']))
  # Search is shorter on small links/aprons; this is NOT a measured piste width.
  search_half_width=min(80,max(12,line.length*.12))
  area=line.buffer(search_half_width,cap_style='flat').intersection(clear)
  parts=list(area.geoms) if hasattr(area,'geoms') else [area]
  parts=[p for p in parts if p.geom_type=='Polygon' and p.area>10 and p.distance(line)<.1]
  area=unary_union(parts).simplify(.35,preserve_topology=True).intersection(clear)
  local_areas.append(area)
  p=f['properties'];areas.append(feature(transform(inverse,area),id='riding/'+p['id'],trailId=p['id'],number=p['number'],widthStatus='estimated-from-clearings',verified=False,maxSearchHalfWidthM=round(search_half_width,2)))
 dump('piste-areas.geojson',collection(areas))
 dump('forest.geojson',collection([feature(transform(inverse,forest),id='abzakovo-woodland',kind='wood',source='OSM + OpenFreeMap landcover')]))
 dump('riding-obstacles.geojson',collection([feature(transform(inverse,blocked),id='abzakovo-obstacles')]))
 # Crown radius is up to 6.4 m: leave at least 7 m from every illustrated riding area.
 exclusion=unary_union([unary_union(local_areas).buffer(7),blocked.buffer(7),lift_lines.buffer(13)])
 allowed=forest.difference(exclusion).intersection(disk.buffer(-7)).buffer(-1)
 rng=np.random.default_rng(83127);spacing=11
 west,south,east,north=allowed.bounds
 xs,ys=np.meshgrid(np.arange(west,east,spacing),np.arange(south,north,spacing));xs=xs.ravel();ys=ys.ravel()
 xs+=rng.uniform(-3.5,3.5,len(xs));ys+=rng.uniform(-3.5,3.5,len(ys));keep=shapely.contains_xy(allowed,xs,ys);xs=xs[keep];ys=ys[keep]
 lons,lats=np.asarray(inverse(xs,ys));seeds=rng.integers(0,65536,len(xs),dtype=np.uint16)
 # True Mapterhorn Terrarium samples, with the same native maxzoom as the map.
 elevations=np.empty(len(xs));dem_sources=[];tiles={}
 for i,(lon,lat) in enumerate(zip(lons,lats)):
  tx,ty=tile_xy(lon,lat,12)
  if (tx,ty) not in tiles:
   path=RAW/f'dem-12-{tx}-{ty}.webp';url=f'https://tiles.mapterhorn.com/12/{tx}/{ty}.webp';dem_sources.append(cached(path,url));rgb=np.asarray(Image.open(path).convert('RGB'),dtype=float);tiles[(tx,ty)]=rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
  z=tiles[(tx,ty)];size=z.shape[0];px=((lon+180)/360*4096-tx)*size-.5;py=((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*4096-ty)*size-.5
  # A half-pixel edge uses its nearest source sample; runtime resamples the current DEM.
  px=np.clip(px,0,size-1);py=np.clip(py,0,size-1);ix=int(px);iy=int(py);fx=px-ix;fy=py-iy;jx=min(ix+1,size-1);jy=min(iy+1,size-1)
  elevations[i]=(z[iy,ix]*(1-fx)+z[iy,jx]*fx)*(1-fy)+(z[jy,ix]*(1-fx)+z[jy,jx]*fx)*fy
 kx=6371008.8*math.pi/180*math.cos(math.radians(lat0));ky=6371008.8*math.pi/180
 packed=np.empty(len(xs),dtype=np.dtype([('x','<i2'),('y','<i2'),('z','<i2'),('seed','<u2')]))
 for name,values in [('x',(lons-lon0)*kx),('y',(lats-lat0)*ky),('z',elevations)]:
  encoded=np.rint(values*10);assert np.all(np.abs(encoded)<32767);packed[name]=encoded.astype('int16')
 packed['seed']=seeds;content=struct.pack('<4sHHIIdd',b'MRFP',1,8,len(xs),spacing,*origin)+packed.tobytes();(OUT/'forest-instances.bin').write_bytes(content)
 metadata={'origin':origin,'count':len(xs),'spacingM':spacing,'sizeBytes':len(content),'sha256':hashlib.sha256(content).hexdigest(),'heightM':[20,30],'decorative':True,'license':'ODbL-1.0 (OSM-derived placement); Mapterhorn source elevation terms','woodWays':osm_woods,'woodTiles':vector_sources,'demTiles':dem_sources,'widthMethod':'Estimated open areas within 80 m of each OSM centreline, minus mapped woodland, roads, buildings, water and lift clearances. Not surveyed piste boundaries.','crownClearanceM':7}
 dump('forest-instances.json',metadata)
 manifest.update(widthStatus='Estimated riding areas from mapped forest clearings; not surveyed piste boundaries.',ridingAreas='piste-areas.geojson',forestInstances='forest-instances.bin',forestCount=len(xs));dump('manifest.json',manifest)
 audit=read('source-audit.json');audit['manifest']=manifest;audit['illustrationAudit']='forest-instances.json';audit['sourceGeometryUnchanged']=True;dump('source-audit.json',audit)
 print(json.dumps({'trees':len(xs),'forestAreaKm2':forest.area/1e6,'ridingAreas':len(areas),'ridingAreaM2':[round(a.area) for a in local_areas],'forestBytes':len(content),'woodTiles':len(vector_sources),'demTiles':len(dem_sources)}))

if __name__=='__main__':main()
