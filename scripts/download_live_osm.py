"""Read-only bounded OSM API export. Reuse the existing snapshot unless --refresh is explicit."""
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
URL='https://api.openstreetmap.org/api/0.6/map?bbox=58.405,53.975,58.47,54.02'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--refresh',action='store_true');args=p.parse_args()
target=ROOT/'data/raw/osm-resort-map.xml'
if target.exists() and not args.refresh:
    print('Using existing OSM API snapshot:',target)
else:
    response=requests.get(URL,headers={'User-Agent':'Mratkino3DMap/0.2 (bounded geographic research)'},timeout=(15,90));response.raise_for_status()
    import xml.etree.ElementTree as ET
    xml=ET.fromstring(response.content)
    if xml.tag!='osm' or not xml.findall('way'):raise ValueError('Expected a nonempty OSM XML export')
    if target.exists():
        archive=target.parent/'history'/hashlib.sha256(target.read_bytes()).hexdigest()
        archive.mkdir(parents=True,exist_ok=True);(archive/target.name).write_bytes(target.read_bytes())
    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(response.content)
metadata={'source':URL,'retrieved_at':datetime.now(timezone.utc).isoformat(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'license':'ODbL 1.0','operation':'read-only OSM map API; no OSM edits'}
meta=target.with_suffix('.source.json')
if not meta.exists() or args.refresh:meta.write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
print('OSM input ready; next: python scripts/prepare_web_data.py')
