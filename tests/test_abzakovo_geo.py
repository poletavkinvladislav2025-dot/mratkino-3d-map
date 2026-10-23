"""Check the actual released Abzakovo coordinates against the WGS84 2 km disk."""
import json, unittest, struct, math
from pathlib import Path
from pyproj import Geod, Transformer
from shapely.geometry import shape
from shapely.ops import transform,unary_union

ROOT=Path(__file__).resolve().parents[1]/'public/region/abzakovo'

def vertices(geometry):
 if hasattr(geometry,'geoms'):
  for part in geometry.geoms:yield from vertices(part)
 elif geometry.geom_type=='Polygon':
  yield from geometry.exterior.coords
  for ring in geometry.interiors:yield from ring.coords
 else:yield from geometry.coords

class AbzakovoGeographyTests(unittest.TestCase):
 def test_all_released_geometries_stay_inside_the_geodesic_radius(self):
  manifest=json.loads((ROOT/'manifest.json').read_text());center=manifest['center'];geod=Geod(ellps='WGS84');count=0
  bbox=list(map(float,manifest['sources']['osm'].split('bbox=')[1].split(',')));west,south,east,north=manifest['bounds']
  self.assertLess(bbox[0],west);self.assertLess(bbox[1],south);self.assertGreater(bbox[2],east);self.assertGreater(bbox[3],north)
  for name in ['trails','lifts','stations','facilities','boundary','forest','piste-areas','riding-obstacles']:
   data=json.loads((ROOT/(name+'.geojson')).read_text())
   for feature in data['features']:
    geometry=shape(feature['geometry']);self.assertTrue(geometry.is_valid,feature['properties']['id'])
    for lon,lat in vertices(geometry):
     distance=geod.inv(*center,lon,lat)[2];self.assertLessEqual(distance,2000.001,(name,feature['properties']['id'],distance));count+=1
  self.assertGreater(count,500)

 def test_trees_clear_all_riding_areas_and_riders_stay_out_of_mapped_woodland(self):
  manifest=json.loads((ROOT/'manifest.json').read_text());lon,lat=manifest['center']
  project=Transformer.from_crs(4326,f'+proj=aeqd +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m',always_xy=True).transform
  geometry=lambda name:unary_union([transform(project,shape(f['geometry'])) for f in json.loads((ROOT/(name+'.geojson')).read_text())['features']])
  forest=geometry('forest');riding=geometry('piste-areas');blocked=geometry('riding-obstacles')
  self.assertLess(forest.intersection(riding).area,.01);self.assertLess(blocked.intersection(riding).area,.01)
  data=(ROOT/'forest-instances.bin').read_bytes();count=struct.unpack_from('<I',data,8)[0];self.assertEqual(count,manifest['forestCount'])
  from shapely.geometry import Point
  kx=6371008.8*math.pi/180*math.cos(math.radians(lat));ky=6371008.8*math.pi/180
  # Check every released candidate, including the 10 cm packing error margin.
  safe_forest=forest.buffer(.1);safe_riding=riding.buffer(6.85);safe_blocked=blocked.buffer(6.85)
  import shapely
  coordinates=[struct.unpack_from('<hhhH',data,32+i*8) for i in range(count)]
  points=[Point(project(lon+x/10/kx,lat+y/10/ky)) for x,y,z,seed in coordinates]
  self.assertTrue(shapely.covers(safe_forest,points).all());self.assertFalse(shapely.intersects(safe_riding,points).any());self.assertFalse(shapely.intersects(safe_blocked,points).any())

if __name__=='__main__':unittest.main()
