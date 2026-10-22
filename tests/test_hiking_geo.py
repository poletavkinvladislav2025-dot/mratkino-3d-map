"""Validate the released tree cells against actual walking lines and mapped open surfaces."""
import json, unittest
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import Point, LineString, shape
from shapely.ops import transform, unary_union
ROOT=Path(__file__).resolve().parents[1]/'public/region/hiking'
PROJECT=Transformer.from_crs(4326,32640,always_xy=True).transform

class HikingGeographyTests(unittest.TestCase):
 def test_tree_cells_keep_clearance_from_routes_open_rocks_and_corridor_edges(self):
  for area in ['malinovaya','yalangas']:
   directory=ROOT/area;data=json.loads((directory/'routes.geojson').read_text());index=json.loads((directory/'nature-index.json').read_text())
   lines=unary_union([transform(PROJECT,LineString(f['geometry']['coordinates'])) for f in data['features'] if f['geometry']['type']=='LineString'])
   peaks=[Point(PROJECT(*f['geometry']['coordinates'])) for f in data['features'] if f['geometry']['type']=='Point' and f['properties']['osmId']]
   # Check metric distances directly, avoiding different polygon-buffer join approximations.
   # WGS84 cell coordinates are rounded to 1e-7 degrees (less than 1 cm here).
   count=0
   for tile in index['tiles']:
    cell=json.loads((directory/tile['url']).read_text());open_surfaces=[]
    for f in cell['surfaces']['features']:
     if f['properties']['kind']!='wood':
      geom=transform(PROJECT,shape(f['geometry']));open_surfaces.append(geom.buffer(2.9) if f['properties']['kind']=='cliff' else geom.buffer(-.8))
    opened=unary_union(open_surfaces)
    for lon,lat,seed in cell['trees']:
     point=Point(PROJECT(lon,lat));distance=point.distance(lines);self.assertGreaterEqual(distance,4.98);self.assertTrue(distance<=250.02 or any(point.distance(p)<=index['summitRadiusM']+.02 for p in peaks));self.assertFalse(opened.contains(point));count+=1
   self.assertEqual(count,index['treeCount']);self.assertGreater(count,10000)

if __name__=='__main__':unittest.main()
