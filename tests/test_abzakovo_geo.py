"""Check the actual released Abzakovo coordinates against the WGS84 2 km disk."""
import json, unittest
from pathlib import Path
from pyproj import Geod
from shapely.geometry import shape

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
  for name in ['trails','lifts','stations','facilities','boundary']:
   data=json.loads((ROOT/(name+'.geojson')).read_text())
   for feature in data['features']:
    geometry=shape(feature['geometry']);self.assertTrue(geometry.is_valid,feature['properties']['id'])
    for lon,lat in vertices(geometry):
     distance=geod.inv(*center,lon,lat)[2];self.assertLessEqual(distance,2000.001,(name,feature['properties']['id'],distance));count+=1
  self.assertGreater(count,500)

if __name__=='__main__':unittest.main()
