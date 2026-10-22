"""Synthetic fixtures are temporary test data, never geographic deliverables."""
import importlib.util, json, tempfile, unittest
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import from_origin
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('terrain',ROOT/'scripts/prepare_terrain.py')
terrain=importlib.util.module_from_spec(spec);spec.loader.exec_module(terrain)

class GeoTests(unittest.TestCase):
    def test_layer_separation_and_provenance(self):
        raw={'elements':[
            {'type':'way','id':1,'tags':{'piste:type':'downhill','name':'Ю1'},'geometry':[{'lon':58.4,'lat':54.0},{'lon':58.41,'lat':54.01}]},
            {'type':'node','id':2,'lon':58.4,'lat':54.0,'tags':{'aerialway':'station'}},
            {'type':'relation','id':3,'tags':{'landuse':'forest'}},
            {'type':'way','id':4,'tags':{'landuse':'forest'},'geometry':[{'lon':1,'lat':1},{'lon':2,'lat':1},{'lon':2,'lat':2},{'lon':1,'lat':1}]}
        ]}
        layers,skipped=terrain.convert_osm(raw)
        self.assertEqual(len(layers['trails']['features']),1)
        self.assertEqual(layers['trails']['features'][0]['properties']['verification'],'osm_unverified')
        self.assertEqual(layers['lifts']['features'][0]['geometry']['type'],'Point')
        self.assertEqual(layers['forest']['features'][0]['geometry']['type'],'Polygon')
        self.assertEqual(len(skipped),1)
        self.assertNotIn('length',layers['trails']['features'][0]['properties'])

    def test_projection_and_no_data_rejection(self):
        import sys
        from unittest.mock import patch
        # A known planar test raster in UTM 40N. Not a model of M ratkino.
        from pyproj import Transformer
        center=Transformer.from_crs('EPSG:4326','EPSG:32640',always_xy=True).transform(58.4,54)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'data/raw').mkdir(parents=True);(root/'data/dem').mkdir()
            location={'center':[58.4,54.0],'bounds':[58.395,53.997,58.405,54.003]}
            (root/'data/raw/location.json').write_text(json.dumps(location))
            (root/'data/raw/osm.json').write_text(json.dumps({'elements':[{'type':'node','id':1,'lon':58.4,'lat':54,'tags':{'amenity':'parking'}}]}))
            (root/'data/dem/source.json').write_text(json.dumps({'vertical_reference':'TEST FIXTURE ONLY'}))
            dem=root/'data/dem/test.tif'
            z=np.tile(np.linspace(100,200,100,dtype='float32'),(100,1))
            def raster(values):
                with rasterio.open(dem,'w',driver='GTiff',width=100,height=100,count=1,dtype='float32',crs='EPSG:32640',transform=from_origin(center[0]-1500,center[1]+1500,30,30),nodata=-9999) as dst:dst.write(values,1)
            raster(z)
            with patch.object(terrain,'ROOT',root),patch.object(sys,'argv',['prepare_terrain.py','--dem',str(dem),'--size','33']):
                terrain.main()
                result=json.loads((root/'data/terrain.json').read_text())
                self.assertEqual(result['crs'],'EPSG:32640')
                self.assertEqual(result['vertical_exaggeration'],1)
                self.assertGreater(result['y'][0],result['y'][-1])
                self.assertLess(result['x'][0],result['x'][-1])
                projected=json.loads((root/'data/projected.json').read_text())
                point=projected['facilities']['features'][0]['geometry']['coordinates']
                self.assertAlmostEqual(point[0],0,places=2);self.assertAlmostEqual(point[1],0,places=2)
                self.assertGreater(point[2],140);self.assertLess(point[2],160)
                z[:]=-9999;raster(z)
                with self.assertRaisesRegex(ValueError,'gaps'):terrain.main()

if __name__=='__main__':unittest.main()
