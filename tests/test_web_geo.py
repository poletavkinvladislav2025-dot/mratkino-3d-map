import importlib.util, unittest
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('webgeo',ROOT/'scripts/prepare_web_data.py');web=importlib.util.module_from_spec(spec);spec.loader.exec_module(web)

class LiveGeoTests(unittest.TestCase):
    def test_terrarium_roundtrip_and_reject_unknown_heights(self):
        z=np.array([[-50.5,0.,795.123,901.126]],dtype='float32');rgb=web.encode_terrarium(z).astype('float64');decoded=rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
        self.assertLess(float(np.max(np.abs(decoded-z))),1/256)
        with self.assertRaisesRegex(ValueError,'Missing actual'):web.encode_terrarium(np.array([[np.nan]],dtype='float32'))
    def test_real_osm_names_conflict_and_woodland(self):
        layers,skipped=web.read_osm(ROOT/'data/raw/osm-resort-map.xml')
        lines=[f for f in layers['trails']['features'] if f['geometry']['type']=='LineString']
        named={f['properties']['name'] for f in lines};self.assertTrue({'Ю1','Ю2','Ю3','Ю4','С1','С2','С3'}.issubset(named));self.assertNotIn('Ю5',named)
        conflict=next(f for f in lines if f['properties']['name']=='Ю3');self.assertEqual(conflict['properties']['ref'],'Ю2');self.assertTrue(conflict['properties']['warnings']);self.assertFalse(conflict['properties']['difficulty_verified'])
        self.assertEqual(len(layers['lifts']['features']),4);self.assertGreater(len(layers['forest']['features']),0);self.assertTrue(all(f['geometry']['type'] in ['Polygon','MultiPolygon'] for f in layers['forest']['features']))
        self.assertEqual(len(skipped),4)
    def test_prepared_center_tile_contains_real_summit_height(self):
        x,y=web.xy(*web.CENTER,14);tile=ROOT/f'public/live/dem/14/{x}/{y}.png';rgb=np.asarray(Image.open(tile)).astype('float64');z=rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
        from pyproj import Transformer
        mx,my=Transformer.from_crs('EPSG:4326','EPSG:3857',always_xy=True).transform(*web.CENTER);west,south,east,north=web.mercator_tile_bounds(x,y,14);col=int((mx-west)/(east-west)*256);row=int((north-my)/(north-south)*256)
        self.assertGreater(z[row,col],750);self.assertLess(z[row,col],850)

if __name__=='__main__':unittest.main()
