"""Import only the two mapped downhill lines and two drag lifts next to Ak Yort.
Other Ufa sports facilities and the public cable car are explicitly excluded.
"""
import pathlib,json,xml.etree.ElementTree as ET,hashlib,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1];path=ROOT/'data/landscape/ak-yort-life-source.osm';root=ET.parse(path).getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')};features=[]
for w in root.findall('way'):
 tags={x.get('k'):x.get('v') for x in w.findall('tag')};coords=[nodes[n.get('ref')] for n in w.findall('nd')];lift=bool(tags.get('aerialway'));rid='ak-yort/way/'+w.get('id')
 features.append({'type':'Feature','properties':{'id':'way/'+w.get('id'),'routeId':rid,'placeId':'ak-yort','name':tags.get('name') or ('Бугельный подъёмник' if lift else 'Горнолыжная трасса'),'number':None,'category':'lift' if lift else 'ski','difficultyOsm':tags.get('piste:difficulty','unknown'),'tags':tags,'geometryVerifiedByResort':False,'operationalStatus':None,'sourceUrl':'https://www.openstreetmap.org/way/'+w.get('id'),'checkedOn':'2026-10-30'},'geometry':{'type':'LineString','coordinates':coords}})
output=ROOT/'public/region/catalog/ak-yort.geojson';output.write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':'))+'\n')
coords=[c for f in features for c in f['geometry']['coordinates']];bounds=[min(c[0] for c in coords),min(c[1] for c in coords),max(c[0] for c in coords),max(c[1] for c in coords)]
p=ROOT/'src/region/winter-places.json';places=json.loads(p.read_text());place=next(p for p in places if p['id']=='ak-yort');place.update(geometryUrl='region/catalog/ak-yort.geojson',bounds=bounds,zoneRadiusKm=2,checkedOn='2026-10-30');p.write_text(json.dumps(places,ensure_ascii=False,indent=2)+'\n')
p=ROOT/'src/region/catalog-routes.json';routes=json.loads(p.read_text());routes=list(dict.fromkeys(routes+[f['properties']['routeId'] for f in features]));p.write_text(json.dumps(routes)+'\n')
print('Ak Yort:',len(features),'exact OSM lines; anchor retained')
