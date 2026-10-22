"""Standalone integration check. All synthetic data stays in a temporary directory."""
import json, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageStat
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='blender-fixture-') as directory:
    root=Path(directory);(root/'data').mkdir();(root/'public/data').mkdir(parents=True)
    n=17;xs=[-300+i*600/(n-1) for i in range(n)];ys=list(reversed(xs));z=[[100+i*1.5+j*.4 for i in range(n)] for j in range(n)]
    (root/'data/terrain.json').write_text(json.dumps({'x':xs,'y':ys,'z':z,'elevation_min':100,'elevation_max':130.4,'TEST_FIXTURE':'NOT GEOGRAPHIC DATA'}))
    feature={'type':'Feature','id':'test/1','properties':{'name':'SYNTHETIC TEST FIXTURE'},'geometry':{'type':'LineString','coordinates':[[-100,0,110],[100,100,120]]}}
    layers={k:{'type':'FeatureCollection','features':[feature] if k=='trails' else []} for k in ['trails','lifts','facilities','forest','roads']}
    (root/'data/projected.json').write_text(json.dumps(layers));(root/'public/data/status.json').write_text(json.dumps({'ready':False,'TEST_FIXTURE':True}))
    log=root/'blender.log'
    with log.open('w') as output:
        result=subprocess.run(['blender','-b','--threads','4','--python',str(ROOT/'scripts/build_scene.py'),'--','--root',str(root),'--resolution','320'],stdout=output,stderr=subprocess.STDOUT)
    if result.returncode:
        print(log.read_text());raise SystemExit(result.returncode)
    for style in ['A','B','C']:
        views=[]
        for view in ['south','north']:
            path=root/f'public/renders/{style}-{view}'
            with Image.open(path.with_suffix('.png')) as image:
                assert image.size==(320,230)
                assert max(ImageStat.Stat(image.convert('RGB')).stddev)>1,'Blank image'
            projection=json.loads(path.with_suffix('.json').read_text())
            points=projection['layers']['trails'][0]['geometry']['coordinates']
            assert all(0<p[0]<320 and 0<p[1]<230 and p[2] for p in points),points
            views.append(points)
        assert views[0]!=views[1],'Camera did not change'
    assert (root/'blender/mratkino.blend').stat().st_size>1000
    assert json.loads((root/'public/data/status.json').read_text())['ready']
    print('PASS: 6 temporary test renders, calibrated camera projections, saved Blender scene. Not a real mountain render.')
