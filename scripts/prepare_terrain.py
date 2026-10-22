"""Project an actual DEM to local metre coordinates and separate OSM layers."""
import argparse, json
from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_bounds
from pyproj import Transformer
ROOT=Path(__file__).resolve().parents[1]

def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',',':')))

def convert_osm(raw):
    layers={key:[] for key in ['trails','lifts','facilities','forest','roads']}
    skipped=[]
    for e in raw['elements']:
        tags=e.get('tags',{})
        key=('trails' if 'piste:type' in tags else 'lifts' if 'aerialway' in tags else 'forest' if tags.get('landuse')=='forest' or tags.get('natural')=='wood' else 'roads' if 'highway' in tags else 'facilities')
        geom=e.get('geometry')
        if e['type']=='node' and 'lon' in e:
            geometry={'type':'Point','coordinates':[e['lon'],e['lat']]}
        elif e['type']=='way' and geom and all('lon' in p and 'lat' in p for p in geom):
            points=[[p['lon'],p['lat']] for p in geom]
            polygon=(key=='forest' or 'building' in tags or tags.get('area')=='yes') and len(points)>=4 and points[0]==points[-1]
            if key=='forest' and not polygon:
                skipped.append(f"way/{e['id']} nonclosed forest"); continue
            geometry={'type':'Polygon' if polygon else 'LineString','coordinates':[points] if polygon else points}
        else:
            skipped.append(f"{e['type']}/{e['id']} (relation or missing geometry)"); continue
        props={'osm_id':f"{e['type']}/{e['id']}",'source':f"https://www.openstreetmap.org/{e['type']}/{e['id']}",'license':'ODbL-1.0','verification':'osm_unverified','confidence':'mapped, not independently verified','tags':tags,'name':tags.get('piste:name',tags.get('name',tags.get('ref','Без названия')))}
        # Do not silently turn OSM lengths or difficulty tags into verified resort facts.
        layers[key].append({'type':'Feature','id':props['osm_id'],'properties':props,'geometry':geometry})
    return {k:{'type':'FeatureCollection','features':v} for k,v in layers.items()},skipped

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--dem',type=Path,default=ROOT/'data/dem/mratkino.tif');p.add_argument('--size',type=int,default=201);a=p.parse_args()
    if not 33<=a.size<=501: p.error('--size must be between 33 and 501')
    location=json.loads((ROOT/'data/raw/location.json').read_text());lon,lat=location['center']
    crs=f'EPSG:{32600+int((lon+180)//6)+1}'
    with rasterio.open(a.dem) as src:
        if src.crs is None: raise ValueError('DEM must declare a CRS')
        if src.scales[0] != 1 or src.offsets[0] != 0:
            raise ValueError('DEM has encoded scale/offset. Convert band values to metre heights before use.')
        units=src.units[0] if src.units else None
        if units not in (None, 'm', 'metre', 'meter'): raise ValueError(f'Unsupported height unit {units}; convert to metres first')
        bounds=transform_bounds('EPSG:4326',crs,*location['bounds'],densify_pts=21)
        affine=from_bounds(*bounds,a.size,a.size)
        z=np.full((a.size,a.size),np.nan,dtype='float32')
        reproject(rasterio.band(src,1),z,src_transform=src.transform,src_crs=src.crs,src_nodata=src.nodata,dst_transform=affine,dst_crs=crs,dst_nodata=np.nan,resampling=Resampling.bilinear)
    if not np.isfinite(z).all(): raise ValueError('DEM has gaps or insufficient coverage. Supply a larger valid raster; no heights fabricated.')
    if np.ptp(z)<1: raise ValueError('Unexpected flat DEM')
    center=Transformer.from_crs('EPSG:4326',crs,always_xy=True).transform(lon,lat)
    xs=np.array([(affine.c+affine.a*(i+.5), affine.f+affine.e*.5) for i in range(a.size)])[:,0]-center[0]
    ys=np.array([(affine.c+affine.a*.5, affine.f+affine.e*(j+.5)) for j in range(a.size)])[:,1]-center[1]
    raw=json.loads((ROOT/'data/raw/osm.json').read_text())
    layers, skipped=convert_osm(raw)
    for key, layer in layers.items(): write(ROOT/f'public/data/{key}.geojson',layer)
    meta={'crs':crs,'origin':list(center),'center':[lon,lat],'bounds_wgs84':location['bounds'],'size':a.size,'x':xs.tolist(),'y':ys.tolist(),'z':np.round(z,2).tolist(),'elevation_min':float(z.min()),'elevation_max':float(z.max()),'vertical_exaggeration':1,'units':'metres','height_reference':json.loads((ROOT/'data/dem/source.json').read_text())['vertical_reference']}
    write(ROOT/'data/terrain.json',meta)
    # Project features once using the same coordinates as the Blender mesh.
    transformer=Transformer.from_crs('EPSG:4326',crs,always_xy=True)
    def coord(v):
        if isinstance(v[0],(float,int)):
            x,y=transformer.transform(*v[:2]); x-=center[0];y-=center[1]
            # Bilinear lookup on the DEM, strictly within mesh coverage.
            if not xs[0]<=x<=xs[-1] or not ys[-1]<=y<=ys[0]: return [x,y,None]
            ix=float(np.interp(x,xs,np.arange(a.size)));iy=float(np.interp(-y,-ys,np.arange(a.size)))
            i,j=int(ix),int(iy);u,vv=ix-i,iy-j;i1=min(i+1,a.size-1);j1=min(j+1,a.size-1)
            h=(1-u)*(1-vv)*z[j,i]+u*(1-vv)*z[j,i1]+(1-u)*vv*z[j1,i]+u*vv*z[j1,i1]
            return [round(x,3),round(y,3),round(float(h),3)]
        return [coord(c) for c in v]
    for layer in layers.values():
        for feature in layer['features']: feature['geometry']['coordinates']=coord(feature['geometry']['coordinates'])
    write(ROOT/'data/projected.json',layers)
    write(ROOT/'public/data/status.json',{'ready':False,'terrain_prepared':True,'center':[lon,lat],'elevation_range':[float(z.min()),float(z.max())],'crs':crs,'incomplete_requests':raw.get('incomplete_requests',[]),'skipped_osm':skipped,'counts':{k:len(v['features']) for k,v in layers.items()},'message':'DEM обработан. Требуется выполнить рендер Blender.'})
    print(f'Actual DEM {a.size}×{a.size}; {z.min():.1f}–{z.max():.1f} m; {crs}; skipped {len(skipped)} OSM geometries')
if __name__=='__main__':main()
