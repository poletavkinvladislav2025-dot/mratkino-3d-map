"""Dense decorative pine placements inside existing OSM woodland; original data untouched."""
import hashlib,json,math,struct
from pathlib import Path
import numpy as np
import shapely
from shapely.geometry import shape,LineString
from shapely.ops import unary_union
from shapely.affinity import affine_transform
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
LIVE=ROOT/'public/live'
ORIGIN=(58.4371909,53.9974603)
RAD=math.pi/180; R=6371008.8; KX=R*RAD*math.cos(ORIGIN[1]*RAD); KY=R*RAD
SPACING=10

def main():
    load=lambda name:json.loads((LIVE/f'{name}.geojson').read_text())['features']
    local=lambda g:affine_transform(shape(g),[KX,0,0,KY,-ORIGIN[0]*KX,-ORIGIN[1]*KY])
    forest=unary_union([local(f['geometry']) for f in load('forest')])
    trails=load('trails'); lifts=load('lifts')
    exclusions=[local(f['geometry']) for f in trails if f['geometry']['type'] in ('Polygon','MultiPolygon')]
    exclusions += [local(f['geometry']).buffer(22) for f in trails if f['geometry']['type']=='LineString' and f['properties']['name']!='С1']
    exclusions += [local(f['geometry']).buffer(13) for f in lifts]
    allowed=forest.difference(unary_union(exclusions)).buffer(-6)
    west,south,east,north=allowed.bounds
    rng=np.random.default_rng(73021)
    xs,ys=np.meshgrid(np.arange(west,east,SPACING),np.arange(south,north,SPACING))
    xs=xs.ravel()+rng.uniform(-SPACING*.4,SPACING*.4,xs.size)
    ys=ys.ravel()+rng.uniform(-SPACING*.4,SPACING*.4,ys.size)
    keep=shapely.contains_xy(allowed,xs,ys);xs=xs[keep];ys=ys[keep]
    lng=ORIGIN[0]+xs/KX;lat=ORIGIN[1]+ys/KY
    # Sample the exact committed Terrarium DEM, bilinear in its Web Mercator grid.
    tiles=list((LIVE/'dem/14').glob('*/*.png'))
    minx=min(int(p.parent.name) for p in tiles);maxx=max(int(p.parent.name) for p in tiles)
    miny=min(int(p.stem) for p in tiles);maxy=max(int(p.stem) for p in tiles)
    mosaic=np.full(((maxy-miny+1)*256,(maxx-minx+1)*256),np.nan,dtype='float32')
    for p in tiles:
        rgb=np.asarray(Image.open(p),dtype='float32');z=rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
        x,y=int(p.parent.name),int(p.stem);mosaic[(y-miny)*256:(y-miny+1)*256,(x-minx)*256:(x-minx+1)*256]=z
    px=((lng+180)/360*2**14-minx)*256-.5
    py=((1-np.arcsinh(np.tan(lat*RAD))/math.pi)/2*2**14-miny)*256-.5
    ix=np.floor(px).astype(int);iy=np.floor(py).astype(int);fx=px-ix;fy=py-iy
    if np.any(ix<0) or np.any(iy<0) or np.any(ix+1>=mosaic.shape[1]) or np.any(iy+1>=mosaic.shape[0]):raise ValueError('DEM does not cover all forest')
    z=(mosaic[iy,ix]*(1-fx)+mosaic[iy,ix+1]*fx)*(1-fy)+(mosaic[iy+1,ix]*(1-fx)+mosaic[iy+1,ix+1]*fx)*fy
    if not np.isfinite(z).all():raise ValueError('Missing actual elevation in forest')
    seeds=rng.integers(0,65536,len(xs),dtype=np.uint16)
    packed=np.empty(len(xs),dtype=np.dtype([('x','<i2'),('y','<i2'),('z','<i2'),('seed','<u2')]))
    for name,values in [('x',xs),('y',ys),('z',z)]:
        values=np.rint(values*10)
        if np.any(np.abs(values)>32767):raise ValueError('Forest coordinates exceed packed range')
        packed[name]=values.astype('int16')
    packed['seed']=seeds
    content=struct.pack('<4sHHIIdd',b'MRFP',1,8,len(xs),SPACING,*ORIGIN)+packed.tobytes()
    (LIVE/'forest-instances.bin').write_bytes(content)
    metadata={'version':1,'count':len(xs),'spacing_m':SPACING,'origin':ORIGIN,'size_bytes':len(content),'sha256':hashlib.sha256(content).hexdigest(),'source':'existing OSM forest minus piste/lift clearances; exact committed Copernicus Terrarium heights','description':'Decorative placement, not an inventory; adult pine model height 20–30m is illustrative.','license':'ODbL-1.0 (OSM-derived placement); Copernicus DEM terms apply to elevations'}
    (LIVE/'forest-instances.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(metadata,ensure_ascii=False))
if __name__=='__main__':main()
