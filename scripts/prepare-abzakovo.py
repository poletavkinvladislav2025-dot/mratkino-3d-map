"""Prepare the Abzakovo ski-area snapshot within a geodesic 2 km radius.
OSM geometry is retained; missing piste widths are never fabricated.
"""
import argparse,datetime,hashlib,json,pathlib,re,xml.etree.ElementTree as ET
import requests
from pyproj import CRS,Transformer,Geod
from shapely.geometry import Point,Polygon,LineString,mapping
from shapely.ops import transform
ROOT=pathlib.Path(__file__).resolve().parents[1];RAW=ROOT/'data/abzakovo';OUT=ROOT/'public/region/abzakovo'
SOURCE='https://api.openstreetmap.org/api/0.6/map?bbox=58.591,53.777,58.654,53.815'
OFFICIAL='https://abzakovo.com/scheme/'
LIFTS={
 '30098248':('Бугельные 1A/1B · северная линия','1A/1B','pair-order-unconfirmed'),
 '30098249':('Бугельные 1A/1B · южная линия','1A/1B','pair-order-unconfirmed'),
 '894506059':('Бугельный 1C','1C','scheme-comparison'),
 '142240054':('Бугельный №3','3','scheme-comparison-needs-check'),
 '96913581':('Бугельный №4','4','scheme-comparison-needs-check'),
 '894506058':('Бугельный №6','6','scheme-comparison-needs-check'),
 '30100563':('Кресельный №5 · 2 места','5','official-and-catalog'),
 '894506057':('Кресельный №7 «Комета» · 4 места','7','official-and-catalog')}
def tags(e):return {t.get('k'):t.get('v') for t in e.findall('tag')}
def dump(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
def fc(features):return {'type':'FeatureCollection','features':features}
def feat(geometry,**props):return {'type':'Feature','properties':props,'geometry':geometry}
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--refresh',action='store_true');args=p.parse_args();RAW.mkdir(exist_ok=True)
 source=RAW/'osm-map.xml'
 if args.refresh or not source.exists():r=requests.get(SOURCE,timeout=90,headers={'User-Agent':'VisitBeloretskMap/0.4 bounded research'});r.raise_for_status();source.write_bytes(r.content)
 root=ET.parse(source).getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')};node_tags={n.get('id'):tags(n) for n in root.findall('node')};ways={w.get('id'):w for w in root.findall('way')}
 building=ways['96913566'];admin=[nodes[n.get('ref')] for n in building.findall('nd')];center=list(Polygon(admin).centroid.coords)[0];center=[round(v,7) for v in center]
 crs=CRS.from_proj4(f'+proj=aeqd +lat_0={center[1]} +lon_0={center[0]} +datum=WGS84 +units=m');project=Transformer.from_crs(4326,crs,always_xy=True).transform;unproject=Transformer.from_crs(crs,4326,always_xy=True).transform;disk=Point(0,0).buffer(1999.95,quad_segs=90);geod=Geod(ellps='WGS84')
 trails=[];lifts=[];stations=[];facilities=[];audit=[]
 def selected(geometry):return transform(project,geometry).intersects(disk)
 def clip(geometry):
  local=transform(project,geometry)
  if disk.covers(local):return mapping(geometry),False
  return mapping(transform(unproject,local.intersection(disk))),True
 for wid,w in ways.items():
  t=tags(w);refs=[n.get('ref') for n in w.findall('nd')]
  if not all(n in nodes for n in refs) or len(refs)<2:continue
  coordinates=[nodes[n] for n in refs];line=LineString(coordinates)
  if not selected(line):continue
  if t.get('piste:type')=='downhill' or t.get('aerialway') in ['platter','chair_lift']:
   geometry,clipped=clip(line);is_lift='aerialway' in t;name=t.get('name','');number=re.search(r'№\s*(\d+)',name);length=geod.geometry_length(line)
   props={'id':'way/'+wid,'name':name or 'Спуск без номера OSM','number':number.group(1) if number else None,'difficultyOsm':t.get('piste:difficulty','unknown'),'tags':t,'source':'OpenStreetMap','sourceUrl':'https://www.openstreetmap.org/way/'+wid,'osmVersion':w.get('version'),'osmTimestamp':w.get('timestamp'),'mappedLengthM':round(length),'clippedAtRadius':clipped,'geometryVerifiedByResort':False,'widthStatus':'not-mapped','originalName':name or None}
   if is_lift:
    display,ref,status=LIFTS[wid];props.update(name=display,number=ref,numberStatus=status,seats=int(t.get('aerialway:occupancy',1)),animate=True)
    if wid=='30100563':props['statusNote']='После объявления об остановке от 07.08.2025 дорога №5 вновь указана в официальном графике на 03–13.07.2026. Текущий режим работы не подтверждён; движение здесь условное.'
    lifts.append(feat(geometry,**props))
   else:trails.append(feat(geometry,**props))
   audit.append({'id':'way/'+wid,'nodeIds':refs,'originalCoordinates':coordinates,'originalTags':t,'clippedAtRadius':clipped})
  if t.get('building') and refs[0]==refs[-1] and len(refs)>3:
   polygon=Polygon(coordinates)
   if polygon.is_valid and selected(polygon):geometry,clipped=clip(polygon);facilities.append(feat(geometry,id='way/'+wid,kind='building',tags={'building':t['building']}))
 for node,coordinates in nodes.items():
  t=node_tags[node]
  if t.get('aerialway') not in ['station','pylon'] or not disk.covers(Point(project(*coordinates))):continue
  stations.append(feat({'type':'Point','coordinates':coordinates},id='node/'+node,name=t.get('name','Станция' if t['aerialway']=='station' else 'Опора'),kind=t['aerialway'],tags={'aerialway':t['aerialway']}))
 # Ensure every mapped lift endpoint is inspectable even when its station has no OSM tag.
 for lift in lifts:
  coordinates=lift['geometry']['coordinates']
  if lift['geometry']['type']!='LineString':continue
  for i,point in enumerate([coordinates[0],coordinates[-1]]):stations.append(feat({'type':'Point','coordinates':point},id=lift['properties']['id']+f'/end-{i}',name=lift['properties']['name'],kind='lift-end',liftId=lift['properties']['id']))
 ring=[list(geod.fwd(*center,b,2000)[:2]) for b in range(0,360,2)];ring.append(ring[0]);boundary=fc([feat({'type':'Polygon','coordinates':[ring]},id='abzakovo-2km',radiusM=2000)])
 numbers=sorted({f['properties']['number'] for f in trails if f['properties']['number']},key=int)
 manifest={'id':'abzakovo','name':'ГЛЦ Абзаково','center':center,'centerSource':'https://www.openstreetmap.org/way/96913566','radiusM':2000,'trailNumbers':numbers,'trailSegments':len(trails),'unnumberedSegments':sum(f['properties']['number'] is None for f in trails),'liftCount':len(lifts),'chairlifts':sum(f['properties']['tags']['aerialway']=='chair_lift' for f in lifts),'surfaceLifts':sum(f['properties']['tags']['aerialway']=='platter' for f in lifts),'ridersPerSegment':{'desktop':18,'mobile':8},'widthStatus':'No downhill piste polygons in the bounded OSM export; riders follow mapped centrelines only.','sources':{'osm':SOURCE,'officialScheme':OFFICIAL,'officialCenter':'https://abzakovo.com/attraction/gornolyzhnyy-tsentr-abzakovo/','catalog':'https://www.skiresort.com/en/ski-resort/abzakovo/ski-lifts/'},'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'license':'ODbL-1.0, © OpenStreetMap contributors','bounds':list(Polygon(ring).bounds)}
 for name,value in [('trails',fc(trails)),('lifts',fc(lifts)),('stations',fc(stations)),('facilities',fc(facilities)),('boundary',boundary),('manifest',manifest),('source-audit',{'manifest':manifest,'objects':audit})]:dump(OUT/(name+'.geojson' if name in ['trails','lifts','stations','facilities','boundary'] else name+'.json'),value)
 print(json.dumps({'center':center,'trailNumbers':numbers,'segments':len(trails),'lifts':len(lifts),'stationAndPylonPoints':len(stations),'bytes':sum(p.stat().st_size for p in OUT.iterdir())}))
if __name__=='__main__':main()
