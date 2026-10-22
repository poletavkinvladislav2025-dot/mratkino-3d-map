"""Build small local Terrarium tiles + documented OSM layers, never inventing geometry."""
import argparse, hashlib, json, math, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
import contourpy
import numpy as np
from PIL import Image
from pyproj import Geod, Transformer
import rasterio
from rasterio.merge import merge
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
from shapely.geometry import Polygon, LineString, Point, box, mapping
from shapely.ops import polygonize, unary_union

ROOT=Path(__file__).resolve().parents[1]
CENTER=[58.4371909,53.9974603]
BOUNDS=[58.405,53.975,58.47,54.02]
TILE_BOUNDS=[58.391,53.970,58.484,54.025]
ATTR='© OpenStreetMap contributors (ODbL 1.0)'

def save(p,v):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')))

def xy(lon,lat,z):
    n=2**z
    return math.floor((lon+180)/360*n), math.floor((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n)

def mercator_tile_bounds(x,y,z):
    half=20037508.342789244;size=2*half/(2**z)
    return (-half+x*size,half-(y+1)*size,-half+(x+1)*size,half-y*size)

def encode_terrarium(height):
    if not np.isfinite(height).all():raise ValueError('Missing actual elevation; refusing synthetic fill')
    value=np.round((height.astype('float64')+32768)*256).astype('uint32')
    return np.stack([(value>>16)&255,(value>>8)&255,value&255],axis=-1).astype('uint8')

def read_osm(path):
    xml=ET.parse(path).getroot()
    nodes={e.attrib['id']:[float(e.attrib['lon']),float(e.attrib['lat'])] for e in xml.findall('node')}
    ways={e.attrib['id']:e for e in xml.findall('way')}
    layers={k:[] for k in ['trails','lifts','stations','forest','roads','facilities']};skipped=[]
    clip=box(*BOUNDS);geod=Geod(ellps='WGS84')
    def tags(e):return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
    def way_points(e):
        refs=[n.attrib['ref'] for n in e.findall('nd')]
        return [nodes[r] for r in refs] if all(r in nodes for r in refs) else None
    def geometry(e,t):
        if e.tag=='node':return Point(nodes[e.attrib['id']])
        if e.tag=='way':
            coords=way_points(e)
            if not coords or len(coords)<2:return None
            area=t.get('area')=='yes' or 'building' in t or t.get('natural')=='wood' or t.get('landuse')=='forest'
            if area:
                return Polygon(coords) if len(coords)>=4 and coords[0]==coords[-1] else None
            return LineString(coords)
        if t.get('type')=='multipolygon':
            rings={role:[] for role in ['outer','inner']}
            for member in e.findall('member'):
                if member.attrib.get('type')!='way':continue
                way=ways.get(member.attrib['ref'])
                if way is None:return None
                coords=way_points(way)
                if not coords:return None
                rings['inner' if member.attrib.get('role')=='inner' else 'outer'].append(LineString(coords))
            # polygonize does not fabricate rings when boundaries are incomplete.
            outer=list(polygonize(unary_union(rings['outer'])))
            if not outer:return None
            value=unary_union(outer)
            if rings['inner']:
                inner=list(polygonize(unary_union(rings['inner'])))
                if not inner:return None
                value=value.difference(unary_union(inner))
            return value
        return None
    for e in xml:
        if e.tag not in ['node','way','relation']:continue
        t=tags(e)
        if t.get('piste:type')=='downhill':layer='trails'
        elif 'aerialway' in t:layer='lifts' if e.tag=='way' else 'stations'
        elif t.get('landuse')=='forest' or t.get('natural')=='wood':layer='forest'
        elif 'highway' in t and e.tag=='way':layer='roads'
        elif 'amenity' in t or 'tourism' in t or 'building' in t or t.get('natural')=='peak':layer='facilities'
        else:continue
        ident=e.tag+'/'+e.attrib['id'];geom=geometry(e,t)
        if geom is None or not geom.is_valid:
            skipped.append({'id':ident,'layer':layer,'reason':'incomplete or invalid geometry'});continue
        geom=geom.intersection(clip)
        if geom.is_empty:continue
        if geom.geom_type=='GeometryCollection':
            skipped.append({'id':ident,'layer':layer,'reason':'mixed geometry after clipping'});continue
        name=t.get('piste:name',t.get('name',t.get('ref','')))
        warnings=[]
        if t.get('name') and t.get('ref') and t['name']!=t['ref']:warnings.append('Название и ref OSM противоречат друг другу: '+t['name']+' / '+t['ref'])
        slope='north' if name.startswith('С') else 'south' if name.startswith('Ю') else ('north' if geom.centroid.y>CENTER[1] else 'south')
        props={'id':ident,'name':name or ('Зона спуска OSM' if layer=='trails' else 'Объект OSM'),'ref':t.get('ref'),'slope':slope,'slope_basis':'name' if name.startswith(('С','Ю')) else 'geometry latitude relative to summit','source':'OpenStreetMap','source_url':'https://www.openstreetmap.org/'+ident,'license':'ODbL-1.0','verification':'osm_unverified','difficulty_verified':False,'difficulty_osm':t.get('piste:difficulty'),'warnings':warnings,'tags':t,'osm_version':e.attrib.get('version'),'osm_timestamp':e.attrib.get('timestamp')}
        if geom.geom_type=='LineString':props['mapped_length_m']=round(abs(geod.geometry_length(geom)))
        layers[layer].append({'type':'Feature','id':ident,'properties':props,'geometry':mapping(geom)})
    return {k:{'type':'FeatureCollection','features':v} for k,v in layers.items()},skipped

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--osm',type=Path,default=ROOT/'data/raw/osm-resort-map.xml');p.add_argument('--minzoom',type=int,default=10);p.add_argument('--maxzoom',type=int,default=14);a=p.parse_args()
    output=ROOT/'public/live';output.mkdir(parents=True,exist_ok=True)
    layers,skipped=read_osm(a.osm)
    for k,v in layers.items():save(output/f'{k}.geojson',v)
    tiles=[]
    paths=sorted((ROOT/'data/dem').glob('Copernicus_DSM_COG_*_DEM.tif'))
    if not paths:raise RuntimeError('Original Copernicus tiles required. Run download_data.py first.')
    opened=[rasterio.open(p) for p in paths]
    try:
        mosaic,transform=merge(opened)
        for z in range(a.minzoom,a.maxzoom+1):
            x0,y0=xy(TILE_BOUNDS[0],TILE_BOUNDS[3],z);x1,y1=xy(TILE_BOUNDS[2],TILE_BOUNDS[1],z)
            for x in range(x0,x1+1):
                for y in range(y0,y1+1):
                    heights=np.full((256,256),np.nan,dtype='float32')
                    reproject(mosaic[0],heights,src_transform=transform,src_crs=opened[0].crs,src_nodata=opened[0].nodata,dst_transform=from_bounds(*mercator_tile_bounds(x,y,z),256,256),dst_crs='EPSG:3857',dst_nodata=np.nan,resampling=Resampling.bilinear)
                    tile=output/f'dem/{z}/{x}/{y}.png';tile.parent.mkdir(parents=True,exist_ok=True);Image.fromarray(encode_terrarium(heights)).save(tile,optimize=True);tiles.append(str(tile.relative_to(output)))
    finally:
        for ds in opened:ds.close()
    terrain=json.loads((ROOT/'data/terrain.json').read_text());xs=np.array(terrain['x']);ys=np.array(terrain['y']);heights=np.array(terrain['z']);origin=terrain['origin']
    contours=[];projection=Transformer.from_crs(terrain['crs'],'EPSG:4326',always_xy=True)
    contour=contourpy.contour_generator(x=xs+origin[0],y=ys+origin[1],z=heights)
    clip=box(*BOUNDS)
    for level in range(450,1000,25):
        for line in contour.lines(level):
            if len(line)<3:continue
            lon,lat=projection.transform(line[:,0],line[:,1]);shape=LineString(zip(lon,lat)).intersection(clip)
            if shape.is_empty:continue
            contours.append({'type':'Feature','properties':{'elevation':level,'source':'Copernicus DEM GLO-30','verification':'dem_derived'},'geometry':mapping(shape)})
    save(output/'contours.geojson',{'type':'FeatureCollection','features':contours})
    named={f['properties']['name'] for f in layers['trails']['features'] if f['properties']['name'].startswith(('Ю','С'))}
    manifest={'version':1,'created_at':datetime.now(timezone.utc).isoformat(),'center':CENTER,'bounds':BOUNDS,'terrain_bounds':TILE_BOUNDS,'minzoom':a.minzoom,'maxzoom':a.maxzoom,'tile_size':256,'encoding':'terrarium','exaggeration':1,'tiles':tiles,'counts':{k:len(v['features']) for k,v in layers.items()},'contour_interval_m':25,'named_trails':sorted(named),'missing_trails':[n for n in ['Ю1','Ю2','Ю3','Ю4','Ю5','С1','С2','С3'] if n not in named],'independently_verified_trails':[],'warnings':skipped,'osm_source':'https://api.openstreetmap.org/api/0.6/map?bbox='+','.join(map(str,BOUNDS)),'osm_sha256':hashlib.sha256(a.osm.read_bytes()).hexdigest(),'dem_source':json.loads((ROOT/'data/dem/source.json').read_text()),'message':'Реальные объекты OSM; актуальность и характеристики не подтверждены курортом.'}
    save(output/'manifest.json',manifest)
    print('Local DEM tiles:',len(tiles),'layers:',manifest['counts'],'named:',sorted(named),'missing:',manifest['missing_trails'],'skipped:',len(skipped),flush=True)

if __name__=='__main__':main()
