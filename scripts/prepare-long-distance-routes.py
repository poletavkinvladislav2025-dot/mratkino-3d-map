"""Reproduce the two owner-supplied full GPX tracks, with every segment intact."""
import hashlib,json,math,pathlib,sys,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCES=[('gut','GUT_2026_10_03_max.gpx','Большая Уральская тропа','#d83b35','https://www.greaturaltrail.ru/map'),('yt','YT_v2-8.gpx','Маршрут YT_v2-8','#f2c52b',None)]
def dump(value):return (json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n').encode()
def length(a,b):
 x,y,X,Y=map(math.radians,[a[0],a[1],b[0],b[1]])
 return 12742.0176*math.asin(min(1,math.sqrt(math.sin((Y-y)/2)**2+math.cos(y)*math.cos(Y)*math.sin((X-x)/2)**2)))
def prepare():
 outputs={};registry=[];audits=[]
 for route_id,filename,name,color,page in SOURCES:
  raw=(ROOT/'data/long-distance'/filename).read_bytes();root=ET.fromstring(raw);ns={'g':root.tag.split('}')[0][1:]};features=[];segment_audit=[];coordinates=[];distance=0
  for track_index,track in enumerate(root.findall('g:trk',ns)):
   for segment_index,seg in enumerate(track.findall('g:trkseg',ns)):
    points=[]
    for p in seg.findall('g:trkpt',ns):
     pair=[float(p.attrib['lon']),float(p.attrib['lat'])];ele=p.find('g:ele',ns)
     if ele is not None and ele.text is not None:pair.append(float(ele.text))
     if not all(math.isfinite(n) for n in pair) or not -180<=pair[0]<=180 or not -85.051129<=pair[1]<=85.051129:raise ValueError(filename+': invalid point')
     points.append(pair)
    if len(points)<2:raise ValueError(filename+': a GPX segment cannot become a line')
    segment_id=f'{route_id}/{len(features)+1}';leg_length=sum(length(a,b) for a,b in zip(points,points[1:]));distance+=leg_length;coordinates.extend(points)
    features.append({'type':'Feature','id':segment_id,'properties':{'routeId':route_id,'segmentId':segment_id,'name':name},'geometry':{'type':'LineString','coordinates':points}})
    segment_audit.append({'id':segment_id,'trackIndex':track_index,'segmentIndex':segment_index,'points':len(points),'first':points[0],'last':points[-1]})
  if not features:raise ValueError(filename+': no tracks')
  bounds=[[min(p[0] for p in coordinates),min(p[1] for p in coordinates)],[max(p[0] for p in coordinates),max(p[1] for p in coordinates)]]
  asset=f'region/long-distance/{route_id}.geojson';body=dump({'type':'FeatureCollection','features':features});outputs[ROOT/'public'/asset]=body
  metadata={'id':route_id,'name':name,'color':color,'asset':asset,'filename':filename,'sourcePage':page,'originalName':[t.findtext('g:name',default='',namespaces=ns) for t in root.findall('g:trk',ns)],'segmentCount':len(features),'pointCount':len(coordinates),'distanceKm':round(distance,3),'bounds':bounds}
  registry.append(metadata);audits.append({**metadata,'sourceSha256':hashlib.sha256(raw).hexdigest(),'geoJSONSha256':hashlib.sha256(body).hexdigest(),'geoJSONBytes':len(body),'waypointCount':len(root.findall('g:wpt',ns)),'segments':segment_audit})
 outputs[ROOT/'src/region/long-distance-routes.json']=dump(registry)
 outputs[ROOT/'data/long-distance/import-audit.json']=dump({'schemaVersion':1,'source':'Owner uploaded GPX files; 2026-10-24','simplified':False,'clipped':False,'bridgedSegments':False,'note':'File order is preserved. BUT is a multi-segment network with branches, not a single ordered start-to-finish line. Waypoints remain in the original GPX and are not added as map places.','routes':audits})
 return outputs
if __name__=='__main__':
 outputs=prepare()
 for path,body in outputs.items():
  if '--check' in sys.argv:
   if not path.exists() or path.read_bytes()!=body:raise SystemExit('Needs regeneration: '+str(path.relative_to(ROOT)))
  else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(body)
 print('Full GPX geometry verified' if '--check' in sys.argv else 'Prepared full GPX geometry', '; '.join(f'{p.name}: {len(b)} B' for p,b in outputs.items()))
