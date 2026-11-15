"""Published GPX replacements. Preserve originals; reverse/trim only documented legs."""
import json,hashlib,xml.etree.ElementTree as ET,copy

def load_published(root,points,routes,distance,out):
 folder=root/'data/directions/source/published-20261115';result={}
 for spec in json.loads((folder/'manifest.json').read_text()):
  data=(folder/spec['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==spec['sha256']
  tree=ET.fromstring(data);segments=tree.findall('.//{*}trkseg');assert len(segments)==1
  vertices=segments[0].findall('{*}trkpt');assert len(vertices)==spec['vertices']
  indexed=list(enumerate(vertices));indexed=indexed[::-1] if spec['reverse'] else indexed
  r=next(r for r in routes if r['id']==spec['routeId']);goal=points[r['goalPointId']];target=[goal['lon'],goal['lat']]
  coord=lambda p:[float(p.get('lon')),float(p.get('lat'))]
  if spec['clipAtGoal']:
   stop=min(range(len(indexed)),key=lambda i:distance(coord(indexed[i][1]),target));indexed=indexed[:stop+1]
  coords=[coord(p) for _,p in indexed];assert len(coords)>30
  # End gaps are retained and reported; never add a connector to the goal.
  gap=distance(coords[-1],target);assert gap<100
  pid=r['id']+'-published-start';points[pid]={'id':pid,'name':'Начало опубликованного GPX','kind':'start','precision':'published_gpx_endpoint_not_verified_parking','lat':coords[0][1],'lon':coords[0][0],'source':spec['sourceFile']}
  processed=spec['reverse'] or spec['clipAtGoal'];filename=r['id']+'.gpx'
  if processed:
   ns=tree.tag.split('}')[0]+'}';export=ET.Element(ns+'gpx',{'version':'1.1','creator':'Visit Beloretsk / source: Extreme Jewelry'});track=ET.SubElement(export,ns+'trk');ET.SubElement(track,ns+'name').text=r['name'];seg=ET.SubElement(track,ns+'trkseg');seg.extend(copy.deepcopy(p) for _,p in indexed);ET.ElementTree(export).write(out/filename,encoding='utf-8',xml_declaration=True)
  else:(out/filename).write_bytes(data)
  result[r['id']]={'coords':coords,'startId':pid,'spec':spec,'processed':processed,'audit':{**spec,'selectedOriginalIndices':[i for i,_ in indexed],'goalGapM':round(gap,2),'mappedVertices':len(coords),'method':'Original GPX vertices only. Reverse and clip at nearest accepted goal when specified; no snapping, interpolation or gap connectors. Published author line; timestamps are not evidence of a GPS recording.'}}
 return result
