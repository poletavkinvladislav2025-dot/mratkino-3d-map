"""Build auditable walking routes and camera-tiled nature detail from bounded OSM snapshots.
Requires requests, shapely and pyproj. No line is drawn between disconnected OSM nodes.
Reuse cached map exports; --download explicitly refreshes the two bounded source areas.
"""
import argparse, collections, datetime, hashlib, heapq, json, math, pathlib, xml.etree.ElementTree as ET
import requests
import mapbox_vector_tile
from pyproj import Transformer
from shapely.geometry import Point, LineString, Polygon, box, mapping, shape
from shapely.ops import transform, unary_union, polygonize
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/hiking';OUT=ROOT/'public/region/hiking'
FORWARD=Transformer.from_crs(4326,32640,always_xy=True).transform
INVERSE=Transformer.from_crs(32640,4326,always_xy=True).transform
DATE=datetime.datetime.now(datetime.timezone.utc).isoformat()
BOXES={'malinovaya':'58.275,53.975,58.355,54.052','yalangas':'58.245,54.045,58.34,54.14'}
POINTS={
 'bel':('Белорецк · старт',[58.346343,53.981498],None),
 'otn':('Отнурок',[58.328721,54.046798],None),
 'first':('Первая Малиновая',[58.316773,54.003275],'2031955355'),
 'second':('Вторая Малиновая',[58.306200,54.008070],'2031955366'),
 'third':('Третья Малиновая',[58.292092,54.021079],'763490278'),
 'a1':('Старт А1',[58.263256,54.062508],None),
 'a2':('Старт А2',[58.321427,54.052998],None),
 'yal':('Ялангас',[58.319030,54.127702],'743130758')}
ROUTES={'malinovaya':[
 ('first-return','До Первой и обратно',['bel','first','bel'],'out-and-back'),
 ('third','Из Отнурка на Третью',['otn','third'],'ascent'),
 ('three-peaks','Через три вершины',['bel','first','second','third','otn'],'through')],
 'yalangas': [('a1','От старта А1',['a1','yal'],'ascent'),('a2','От старта А2',['a2','yal'],'ascent')]}
def dump(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
def tags(e):return {t.get('k'):t.get('v') for t in e.findall('tag')}
def feature(geometry,**properties):return {'type':'Feature','properties':properties,'geometry':geometry}
def collection(features):return {'type':'FeatureCollection','features':features}
def distance(a,b):
 lon1,lat1,lon2,lat2=map(math.radians,[*a[:2],*b[:2]])
 return 12742017.6*math.asin(min(1,math.sqrt(math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2)))
def vector_woodland(zone,area):
 """Complete woodland masks from a few existing OpenFreeMap tiles, clipped to the corridor.
 OSM map API relations can extend far beyond the requested box; incomplete rings are not guessed.
 """
 tilejson=json.loads((ROOT/'data/region/openfreemap-tilejson.json').read_text());template=tilejson['tiles'][0]
 geographic=transform(INVERSE,zone);w,s,e,n=geographic.bounds;z=13;scale=2**z
 def tile(lon,lat):return (math.floor((lon+180)/360*scale),math.floor((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*scale))
 x1,y1=tile(w,n);x2,y2=tile(e,s);woods=[];sources=[];merc_to_local=Transformer.from_crs(3857,32640,always_xy=True).transform
 for tx in range(x1,x2+1):
  for ty in range(y1,y2+1):
   path=RAW/f'forest-{z}-{tx}-{ty}.pbf';url=template.replace('{z}',str(z)).replace('{x}',str(tx)).replace('{y}',str(ty))
   if not path.exists():r=requests.get(url,timeout=45);r.raise_for_status();path.write_bytes(r.content)
   data=mapbox_vector_tile.decode(path.read_bytes(),default_options={'y_coord_down':True}).get('landcover',{});extent=data.get('extent',4096)
   def project(x,y,z_unused=None):
    mx=((tx+x/extent)/scale-.5)*40075016.68557849;my=(.5-(ty+y/extent)/scale)*40075016.68557849
    return merc_to_local(mx,my)
   for f in data.get('features',[]):
    if f['properties'].get('class')=='wood':
     geom=transform(project,shape(f['geometry']));geom=geom if geom.is_valid else geom.buffer(0);clipped=geom.intersection(zone)
     if not clipped.is_empty:woods.append(clipped)
   sources.append({'url':url,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 dump(OUT/area/'forest-sources.json',{'source':'OpenFreeMap landcover/wood, OSM-derived; clipped to hiking corridors','zoom':z,'tiles':sources})
 return unary_union(woods)
def process(area):
 source=RAW/(area+'-osm.xml');root=ET.parse(source).getroot()
 nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')}
 node_tags={n.get('id'):tags(n) for n in root.findall('node') if n.findall('tag')}
 ways={w.get('id'):{'tags':tags(w),'nodes':[n.get('ref') for n in w.findall('nd')]} for w in root.findall('way')}
 xy={k:FORWARD(*v) for k,v in nodes.items()};graph=collections.defaultdict(list);paths=[]
 for wid,w in ways.items():
  t=w['tags'];refs=w['nodes']
  if all(n in nodes for n in refs) and t.get('highway') and t.get('highway') not in ['proposed','construction']:paths.append(LineString([xy[n] for n in refs]))
  if t.get('highway') not in ['path','track','footway','steps','bridleway','pedestrian','residential','unclassified','service','living_street']:continue
  if t.get('foot') in ['no','private'] or t.get('access') in ['no','private'] and t.get('foot') not in ['yes','designated','permissive']:continue
  for a,b in zip(refs,refs[1:]):
   if a not in nodes or b not in nodes:continue
   length=distance(nodes[a],nodes[b]);weight=length*(1 if t.get('highway') in ['path','footway','track','steps'] else 1.1)
   if t.get('oneway:foot')!='-1':graph[a].append((b,weight,wid))
   if t.get('oneway:foot')!='yes':graph[b].append((a,weight,wid))
 def shortest(a,b):
  queue=[(0,a)];cost={a:0};prev={}
  while queue:
   d,n=heapq.heappop(queue)
   if d>cost[n]:continue
   if n==b:break
   for nn,w,wid in graph[n]:
    if d+w<cost.get(nn,math.inf):cost[nn]=d+w;prev[nn]=(n,wid);heapq.heappush(queue,(d+w,nn))
  if b not in cost:raise ValueError('Disconnected OSM walking network: '+a+' -> '+b)
  ids=[b];used=[]
  while ids[-1]!=a:n,wid=prev[ids[-1]];ids.append(n);used.append(wid)
  return ids[::-1],used[::-1]
 stops={};used_keys=set(k for _,_,via,_ in ROUTES[area] for k in via)
 for k in used_keys:
  name,requested,peak_id=POINTS[k];actual=nodes[peak_id] if peak_id else requested
  nearest=min(graph,key=lambda n:math.dist(xy[n],FORWARD(*actual)));gap=distance(nodes[nearest],actual)
  if gap>60:raise ValueError(f'{name}: walking line is {gap:.1f} m away')
  stops[k]={'name':name,'requestedCoordinates':requested,'coordinates':actual,'osmId':'node/'+peak_id if peak_id else None,'elevation':node_tags.get(peak_id,{}).get('ele'),'node':nearest,'snapDistanceM':round(gap,1),'requestedToPeakDistanceM':round(distance(requested,actual),1)}
 feats=[];audit_routes=[];route_lines=[]
 for rid,title,via,kind in ROUTES[area]:
  ids=[];source_ways=[]
  for a,b in zip(via,via[1:]):
   # A return trip reverses exactly the ascent: no unconfirmed alternative loop.
   if kind=='out-and-back' and ids:leg=list(reversed(ids));used=list(reversed(source_ways))
   else:leg,used=shortest(stops[a]['node'],stops[b]['node'])
   ids.extend(leg[1:] if ids else leg);source_ways.extend(used)
  coords=[nodes[n] for n in ids];length=sum(distance(a,b) for a,b in zip(coords,coords[1:]));route_lines.append(transform(FORWARD,LineString(coords)))
  feats.append(feature({'type':'LineString','coordinates':coords},id=rid,name=title,kind=kind,verified=False,status='osm-network-needs-check',distanceM=round(length),source='OpenStreetMap · расчёт по связной пешеходной сети',via=via,sourceWayIds=sorted(set(source_ways))))
  for index,k in enumerate(via):
   s=stops[k];role='start' if index==0 else 'finish' if index==len(via)-1 else 'peak'
   if kind=='out-and-back' and index==len(via)-1:continue
   feats.append(feature({'type':'Point','coordinates':s['coordinates']},routeId=rid,key=k,name=s['name'],sequence=index+1,role='start-finish' if kind=='out-and-back' and index==0 else role,snapDistanceM=s['snapDistanceM'],osmId=s['osmId']))
  hazards=[]
  for wid in set(source_ways):
   t=ways[wid]['tags']
   for key in ['ford','seasonal','sac_scale','trail_visibility','access','foot']:
    if key in t:hazards.append({'way':wid,key:t[key]})
  audit_routes.append({'id':rid,'nodes':ids,'edgeWayIds':source_ways,'distanceM':round(length),'via':via,'hazards':hazards})
 directory=OUT/area;dump(directory/'routes.geojson',collection(feats))
 used_way_ids=set(wid for r in audit_routes for wid in r['edgeWayIds'])
 audit={'generatedAt':DATE,'license':'ODbL-1.0','osmSource':'https://api.openstreetmap.org/api/0.6/map?bbox='+BOXES[area],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'Dijkstra over shared OSM nodes; public walking edges only; no gap bridging; no safety verification','stops':stops,'routes':audit_routes,'ways':{wid:{'tags':ways[wid]['tags'],'nodes':ways[wid]['nodes']} for wid in sorted(used_way_ids)},'nodes':{n:nodes[n] for wid in used_way_ids for n in ways[wid]['nodes'] if n in nodes}}
 dump(directory/'route-audit.json',audit)
 # Detail only inside 250 m route corridors and 500/700 m summit areas.
 summit_radius=700 if area=='yalangas' else 500
 zone=unary_union([line.buffer(250) for line in route_lines]+[Point(FORWARD(*s['coordinates'])).buffer(summit_radius) for s in stops.values() if s['osmId']])
 surfaces=[]
 def classification(t):
  if t.get('natural')=='wood' or t.get('landuse')=='forest':return 'wood'
  return t.get('natural') if t.get('natural') in ['bare_rock','scree','grassland','heath','scrub','water','cliff'] else 'clearing' if t.get('landuse') in ['meadow','farmland','residential'] else None
 def add_surface(geom,kind,osm_id):
  if not geom.is_valid:geom=geom.buffer(0)
  clipped=geom.intersection(zone)
  if not clipped.is_empty:surfaces.append((clipped,kind,osm_id))
 for wid,w in ways.items():
  kind=classification(w['tags']);refs=w['nodes']
  if not kind or not all(n in nodes for n in refs):continue
  coords=[xy[n] for n in refs]
  if kind=='cliff':add_surface(LineString(coords),kind,'way/'+wid)
  elif refs[0]==refs[-1] and len(coords)>=4:add_surface(Polygon(coords),kind,'way/'+wid)
 for relation in root.findall('relation'):
  kind=classification(tags(relation))
  if not kind:continue
  outer=[];inner=[];complete=True
  for member in relation.findall('member'):
   if member.get('type')!='way':continue
   w=ways.get(member.get('ref'))
   if not w or not all(n in nodes for n in w['nodes']):complete=False;break
   (inner if member.get('role')=='inner' else outer).append(LineString([xy[n] for n in w['nodes']]))
  if complete and outer:
   outer_polys=list(polygonize(unary_union(outer)));inner_polys=list(polygonize(unary_union(inner))) if inner else []
   if outer_polys:add_surface(unary_union(outer_polys).difference(unary_union(inner_polys)),kind,'relation/'+relation.get('id'))
 woods=unary_union([g for g,k,_ in surfaces if k=='wood']+[vector_woodland(zone,area)])
 exclusions=unary_union([g.buffer(3 if k=='cliff' else 0) for g,k,_ in surfaces if k!='wood']+[p.buffer(5) for p in paths])
 woodland=woods.difference(exclusions)
 w,s,e,n=zone.bounds;tiles=[];tree_count=0
 for tx in range(math.floor(w/500),math.floor(e/500)+1):
  for ty in range(math.floor(s/500),math.floor(n/500)+1):
   tile_box=box(tx*500,ty*500,(tx+1)*500,(ty+1)*500)
   if not tile_box.intersects(zone):continue
   trees=[];clip=woodland.intersection(tile_box)
   if not clip.is_empty:
    for gx in range(math.ceil(tx*500/14),math.ceil((tx+1)*500/14)):
     for gy in range(math.ceil(ty*500/14),math.ceil((ty+1)*500/14)):
      seed=((gx*73856093)^(gy*19349663))&0xffffffff
      x=gx*14+((seed%997)/997-.5)*8;y=gy*14+(((seed>>10)%991)/991-.5)*8
      if not tile_box.covers(Point(x,y)) or not clip.covers(Point(x,y)):continue
      lon,lat=INVERSE(x,y);trees.append([round(lon,7),round(lat,7),seed])
   tile_features=[]
   for g,k,oid in surfaces:
    if k=='wood':continue
    geom=g.intersection(tile_box)
    if not geom.is_empty:tile_features.append(feature(mapping(transform(INVERSE,geom.simplify(.7,preserve_topology=True))),kind=k,osmId=oid))
   if not trees and not tile_features:continue
   filename=f'{tx}-{ty}.json';dump(directory/'tiles'/filename,{'trees':trees,'surfaces':collection(tile_features)})
   coords=mapping(transform(INVERSE,tile_box))['coordinates'][0];lons,lats=zip(*coords)
   tiles.append({'id':f'{tx}-{ty}','bounds':[min(lons),min(lats),max(lons),max(lats)],'trees':len(trees),'url':'tiles/'+filename});tree_count+=len(trees)
 dump(directory/'nature-index.json',{'area':area,'generatedAt':DATE,'license':'ODbL-1.0','routeBufferM':250,'summitRadiusM':summit_radius,'treeSpacingM':14,'treeCount':tree_count,'tiles':tiles,'terrain':'Existing Mapterhorn DEM, no invented rock geometry','zone':mapping(transform(INVERSE,zone.simplify(8)))})
 active={pathlib.Path(tile['url']).name for tile in tiles}
 for old in (directory/'tiles').glob('*.json'):
  if old.name not in active:old.unlink()
 print(area,[(r['id'],r['distanceM']) for r in audit_routes],'nature cells',len(tiles),'tree candidates',tree_count)
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--download',action='store_true');args=p.parse_args();RAW.mkdir(exist_ok=True)
 for area,bounds in BOXES.items():
  path=RAW/(area+'-osm.xml')
  if args.download or not path.exists():
   response=requests.get('https://api.openstreetmap.org/api/0.6/map',params={'bbox':bounds},headers={'User-Agent':'VisitBeloretskMap/0.3 bounded research'},timeout=90);response.raise_for_status();path.write_bytes(response.content)
  process(area)
if __name__=='__main__':main()
