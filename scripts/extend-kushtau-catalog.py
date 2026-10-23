import json,xml.etree.ElementTree as E,pathlib,math
root=pathlib.Path(__file__).resolve().parents[1];places=[p for p in json.load(open(root/'src/region/winter-places.json')) if p['id']!='kushtau'];routes=json.load(open(root/'src/region/catalog-routes.json'));audit=json.load(open(root/'public/region/catalog/audit.json'))
r=E.parse(root/'data/landscape/kushtau.xml').getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in r.findall('node')};poi=next(n for n in r.findall('node') if n.get('id')=='10679929141');point=nodes[poi.get('id')];features=[]
for w in r.findall('way'):
 t={e.get('k'):e.get('v') for e in w.findall('tag')};refs=[n.get('ref') for n in w.findall('nd')]
 if not(t.get('aerialway') or t.get('piste:type')) or len(refs)<2 or not all(n in nodes for n in refs):continue
 rid='kushtau/way/'+w.get('id');routes.append(rid);features.append({'type':'Feature','properties':{'id':'way/'+w.get('id'),'routeId':rid,'placeId':'kushtau','number':t.get('ref'),'name':t.get('name') or ('Подъёмник' if t.get('aerialway') else 'Участок OSM'),'category':'lift' if t.get('aerialway') else 'ski','tags':t,'difficultyOsm':t.get('piste:difficulty','unknown'),'sourceUrl':'https://www.openstreetmap.org/way/'+w.get('id'),'geometryVerifiedByResort':False,'operationalStatus':None},'geometry':{'type':'LineString','coordinates':[nodes[n] for n in refs]}})
coords=[p for f in features for p in f['geometry']['coordinates']];bounds=[min(p[0] for p in coords),min(p[1] for p in coords),max(p[0] for p in coords),max(p[1] for p in coords)]
x,y=point;lat=53.9680705;lng=58.4099549;rad=math.pi/180;km=12742.0176*math.asin(math.sqrt(math.sin((y-lat)*rad/2)**2+math.cos(y*rad)*math.cos(lat*rad)*math.sin((x-lng)*rad/2)**2));assert km<200
places.append({'id':'kushtau','name':'Куш-Тау','kind':'resort','category':'ski','coordinates':point,'coordinateStatus':'osm-reference-matched','coordinateSource':'https://www.openstreetmap.org/node/10679929141','sourceUrl':'https://www.openstreetmap.org/node/10679929141','description':'Горнолыжный центр возле Стерлитамака, отмеченный в OSM отдельно от одноимённой горы. Текущая работа не подтверждена.','distanceKm':round(km,1),'major':True,'geometryUrl':'region/catalog/kushtau.geojson','bounds':bounds})
(root/'public/region/catalog/kushtau.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
for path in (root/'public/region/catalog').glob('*.geojson'):
 d=json.load(open(path))
 for f in d['features']:
  t=f['properties']['tags'];kind=t.get('piste:type')
  if kind in ['snowtubing','tubing','sled','sleigh']:f['properties']['category']='tubing'
  if kind in ['snow_park','ski_jump','playground','sleigh']:f['properties']['category']='training'
 path.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
(root/'src/region/winter-places.json').write_text(json.dumps(places,ensure_ascii=False,indent=2)+'\n');(root/'src/region/catalog-routes.json').write_text(json.dumps(sorted(set(routes)))+'\n');audit['unresolved']=[x for x in audit['unresolved'] if x['id']!='kushtau'];audit['additionalGeometry']['kushtau']=len(features);(root/'public/region/catalog/audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
