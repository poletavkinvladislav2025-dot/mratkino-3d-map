"""Compile the owner's immutable route scenarios and audited GPX/trekking results.
No online routing at runtime, no synthetic gap connectors, no village-centre trailheads.
"""
import json,pathlib,math,hashlib,datetime,xml.etree.ElementTree as ET
from shapely.geometry import Point,LineString
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parents[1];DATA=ROOT/'data/directions';OUT=ROOT/'public/region/directions';OUT.mkdir(parents=True,exist_ok=True)
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n')
x=read(DATA/'input/routes.json');points={p['id']:p for p in x['points']};refs={f['properties']['id']:f for f in read(DATA/'input/source-tracks.geojson')['features']};routing={r['routeId']:r for r in read(DATA/'routing/index.json')};T=Transformer.from_crs(4326,32640,always_xy=True).transform
ALIASES={'malinovaya-first':['malinovaya/first-return'],'malinovaya-third':['malinovaya/third'],'malinovaya-three-through':['malinovaya/three-peaks'],'malinovaya-three-return':['malinovaya/three-peaks-return'],'yalangas-a1':['yalangas/a1'],'yalangas-a2':['yalangas/a2']}
PLACE_ALIASES={'aigir':'aygir','small-yamantau':'maly-yamantau'}
COLORS=['#126b70','#8853a6','#cc6b20','#3369b3','#b34958','#647b26']
DESCRIPTIONS={'malinovaya-first': 'Подъём из Белорецка к Первой Малиновой и возвращение по тому же пешему подходу.', 'malinovaya-third': 'Подъём со стороны Отнурка к Третьей Малиновой с возвращением к началу пути.', 'malinovaya-three-through': 'Переход из Белорецка через Первую, Вторую и Третью Малиновые с финишем в Отнурке.', 'malinovaya-three-return': 'Подъём из Белорецка последовательно к Первой, Второй и Третьей Малиновым. Возвращение к началу пути по той же нитке.', 'yalangas-a1': 'Подъём на Ялангас от старта А1 и возвращение тем же путём. Полное расстояние включает подъём и спуск.', 'yalangas-a2': 'Подъём на Ялангас от старта А2 и возвращение тем же путём. Полное расстояние включает подъём и спуск.', 'rassypnaya-shushpa': 'Пеший подход из Шушпы к Восточному бастиону Рассыпной с возвращением к началу пути.', 'kraka-shigaevo': 'Пеший выход от Горной улицы в Шигаево к выбранной видовой точке хребта Крака и возвращение тем же путём.', 'kumardak-iselgan': 'Лесной подход от шале Иселган к Большому Кумардаку. Возвращение по той же пешей нитке.', 'inzerskie-tirlyan': 'Подход из Тирлянского к Горному цирку Инзерских Зубчаток по опубликованному треку. Начало GPX не обозначает оборудованную парковку.', 'inzerskie-car-access': 'Пеший подход к Горному цирку от указанного автомобильного подъезда. Возможность проезда и состояние переправ зависят от условий.', 'inzerskie-verkhnearshinskiy': 'Подход к Горному цирку со стороны Верхнеаршинского от Иселгана с возвращением к началу пути.', 'iremel-upper': 'Подъём от КПП Тюлюк на Большой Иремель по Верхней тропе и возвращение по ней же.', 'iremel-lower': 'Подъём от КПП Тюлюк на Большой Иремель по Нижней тропе и возвращение по ней же.', 'sinie-skaly-short': 'Короткий пеший подход к Синим скалам между согласованными началом и видовой точкой. Возвращение тем же путём.', 'aigir-shurale': 'Пеший подход от станции Айгир к Зубам Шурале с возвращением к станции.', 'aigir-ufa': 'Подход от станции Айгир в сторону пика Уфа. Последний участок до принятой цели пока не подтверждён.', 'poperechnaya-tyulyuk': 'Подход из Тюлюка через стоянку Под Поперечной к конечной точке официального паспорта маршрута и возвращение.', 'masim-akbulatovo': 'Длинный пеший подход к Масиму из Старого Акбулатово с возвращением по той же нитке.', 'kirel-kuzgun': 'Подъём к Кирели от брода со стороны Кузгун-Ахмерово. Возвращение по линии подъёма; расстояние включает обе стороны.', 'arvyak-ryaz-main': 'Пеший выход к Арвяк-Рязи по опубликованному треку. Начало у автомобиля и участки подхода показаны отдельно; полного замкнутого кольца пока нет.', 'bolshoy-shatak-avzyan': 'Протяжённый двухдневный поход от Верхнего Авзяна по хребту Шатак. Показана линия до конца опубликованного трека и возвращение по ней.', 'atysh-station': 'Пеший подход к водопаду Атыш от ориентира платформы Водопад. Начало подхода и переправы требуют дополнительной проверки.'}
DATE='2026-11-01';features=[];rows=[];audit=[]
def distance(a,b):
 a,b=[math.radians(v) for v in a[:2]],[math.radians(v) for v in b[:2]];return 12742017.6*math.asin(min(1,math.sqrt(math.sin((b[1]-a[1])/2)**2+math.cos(a[1])*math.cos(b[1])*math.sin((b[0]-a[0])/2)**2)))
def length(c):return sum(distance(a,b) for a,b in zip(c,c[1:]))
def bounds(coords):return [[min(c[0] for c in coords),min(c[1] for c in coords)],[max(c[0] for c in coords),max(c[1] for c in coords)]] if coords else None
def point(pid,role):
 p=points.get(pid)
 if not p or p['lat'] is None or p['lon'] is None or p.get('precision')=='not_trailhead':return None
 return {**p,'role':role,'coordinates':[p['lon'],p['lat']]}
# Real GPX from the public route page supplies a specific start, not Tirlyan's centre.
extra=read(DATA/'research/extra.json');tir=next(r for r in extra if 'rutrail' in r['url'] and r.get('httpStatus')==200);tree=ET.parse(DATA/'source/tirlyan.gpx');tir_coords=[[float(p.get('lon')),float(p.get('lat'))] for p in tree.getroot().iter() if p.tag.endswith('}trkpt')]
points['tirlyan-gpx-start']={'id':'tirlyan-gpx-start','name':'Начало опубликованного GPX из Тирлянского','lat':tir_coords[0][1],'lon':tir_coords[0][0],'kind':'start','precision':'gpx_start_not_verified_parking','source':'https://rutrail.org/trails/66/gpx/'}
for index,r in enumerate(x['routes']):
 rid=r['id'];row={**r,'id':rid,'routeId':rid,'originalStartPointId':r['startPointId'],'originalGoalPointId':r['goalPointId'],'placeId':r['placeId'],'mapPlaceId':PLACE_ALIASES.get(r['placeId'],r['placeId']),'title':r['name'],'aliases':ALIASES.get(rid,[]),'revision':1,'checkedAt':DATE,'buildStatus':'needs_data','publicReady':False,'hasGeometry':False,'geometrySource':None,'color':COLORS[index%len(COLORS)],'category':'hiking','minZoom':10,'asset':'region/directions/routes.geojson','displayAsset':'region/directions/routes-display.geojson','featureId':rid,'description':DESCRIPTIONS.get(rid,'Пеший вариант «'+r['name']+'». Полная линия маршрута пока уточняется.')};coords=[];extra_lines=[];reason=[];ids=[r['startPointId'],*r['viaPointIds'],r['goalPointId']];routepoints=[]
 if rid=='inzerskie-tirlyan':row['startPointId']='tirlyan-gpx-start';row['finishPointId']='tirlyan-gpx-start';ids=['tirlyan-gpx-start',r['goalPointId']]
 for i,pid in enumerate(dict.fromkeys(p for p in ids if p)):
  role=('start-finish' if r['tripType'] in ['loop','out_and_back'] else 'start') if pid==row['startPointId'] else 'goal' if pid==r['goalPointId'] else 'via';p=point(pid,role)
  if p:routepoints.append(p)
 provenance={}
 if rid in routing and routing[rid].get('httpStatus')==200 and rid!='small-yamantau-ecotrail':
  raw=read(DATA/'routing'/(rid+'.json'));f=raw['features'][0];coords=f['geometry']['coordinates'];line=LineString([T(*c[:2]) for c in coords]);gaps=[line.distance(Point(*T(*p['coordinates']))) for p in routepoints];rail=[t for t in routing[rid].get('wayTags',[]) if 'railway=' in t and not ('railway=abandoned' in t or 'railway=disused' in t)]
  provenance={**routing[rid],'method':'BRouter trekking walking profile; stored offline; no straight gap closure','snapDistancesM':dict(zip([p['id'] for p in routepoints],[round(g,2) for g in gaps]))}
  for p,gap in zip(routepoints,gaps):
   p['snapDistanceM']=round(gap,2);p['originalPoint']=p['coordinates'];i=min(range(len(coords)),key=lambda i:distance(coords[i],p['coordinates']));p['snappedPoint']=coords[i][:2]
  row['geometrySource']='calculated_osm_walking';row['buildStatus']='ready'
  if rail:reason.append('Расчёт затрагивает железнодорожные пути; линия не опубликована.');coords=[];row['buildStatus']='needs_geometry'
  if max(gaps,default=0)>80:
   reason.append('Пешеходная сеть не доходит до принятой цели или контрольных точек; соединение не дорисовано.');row['buildStatus']='partial'
   if max(gaps)>500:coords=[];row['buildStatus']='needs_geometry'
  if rid=='kurtashtau-station':row['geometrySourceLabel']='Линию провела карта по известным ей дорогам и тропам.';row['description']='Линию провела карта по известным ей дорогам и тропам. Короткой тропы от станции, которую упоминают описания, на карте нет, поэтому путь получился заметно длиннее. Ориентируйтесь на месте.'
  if (points.get(row['startPointId']) or {}).get('kind')=='village_center' or rid=='kirel-otnurok':
   nm=points[row['startPointId']]['name'];start='в Отнурке, там же, где у Малиновой' if rid=='kirel-otnurok' else nm.split(' (')[1].rstrip(')')+' '+nm.split(' (')[0]
   row['geometrySourceLabel']='Линию провела карта по дорогам и тропам.';row['description']=f'Старт — {start}. Линию до вершины провела карта по дорогам и тропам; точный выход на тропу уточняйте на месте.'
  if rid=='small-iremel-tyulyuk':row['geometrySourceLabel']='Линию провела карта по тропам.';row['description']='Старт — КПП Тюлюк, как у подъёма на Большой Иремель. Линию до вершины провела карта по тропам национального парка.'
  if rid=='kurtashtau-sok':row['geometrySourceLabel']='Линию провела карта по пешим тропам и грунтовкам.';row['description']='Короткий подъём от СОК «Курташ» по лесной дороге и тропе. Старт — шлагбаум из старого реестра мест; подъезд уточните перед поездкой.'
  if rid=='atysh-station':reason.append('Геометрия рассчитана по пешей сети; исходный ориентир платформы и переправы требуют дополнительной сверки.');row['buildStatus']='partial'
  row['sourceUrl']=r['sourceUrl'] or ('https://www.visitbeloretsk.ru/'+r['placeId'])
 elif rid=='small-yamantau-ecotrail':
  coords=[p['coordinates'] for p in routepoints];row['geometrySource']='schematic_control_points';row['geometrySourceLabel']='Схема: прямые между точками паспорта экотропы заповедника. Это не трек — на месте идите по указателям тропы.';row['buildStatus']='partial';row['sourceUrl']=r['sourceUrl'];reason.append('Тропы нет в пешей сети карты; показана схема по контрольным точкам паспорта экотропы.');provenance={'method':'Straight segments between the eco-trail passport control points, at owner request 12.11.2026; not a surveyed track','points':[p['id'] for p in routepoints]}
 elif rid in ('iremel-tyulyuk-village','kushay-road'):
  row['placeOnly']=True;row['buildStatus']='duplicate';reason.append('Повторяет другой маршрут этого места.')
 elif rid in ('arskiy-kamen-short','kamennaya-rechka-otnurok'):
  row['placeOnly']=True;row['buildStatus']='place_only';reason.append('К месту ведёт дорога; отдельный пеший маршрут не нужен.')
 elif rid=='inzerskie-tirlyan':
  coords=tir_coords;row['geometrySource']='source_gpx';row['buildStatus']='ready';row['sourceUrl']='https://rutrail.org/trails/66/';row['downloadUrl']='https://rutrail.org/trails/66/gpx/';provenance={**tir,'method':'Published GPX, original order; exact file trailhead derived independently; no parking claim'}
 elif rid=='vishnevaya-lomovka' and (DATA/'source/vishnevaya-published.geojson').exists():
  author=read(DATA/'source/vishnevaya-published.geojson')['features'][0];coords=author['geometry']['coordinates'];row['geometrySource']='published_author_line';row['geometrySourceLabel']='Авторская линия ИдиЛесом';row['buildStatus']='ready';row['description']='Авторская пешая линия к Вишнёвой. Конец опубликованного маршрута не обозначает точную высшую точку. Линия пересекает Ятву; рядом в OSM отмечен низководный переход. Его доступность зависит от уровня воды.';provenance={**author['properties'],'crossingAudit':'data/directions/source/vishnevaya-crossing-audit.json','method':'Public author coordinates; no linear gap closure or invented summit extension'}
 elif r['referenceTrackId']:
  ref=refs[r['referenceTrackId']]
  if rid in ['kirel-kuzgun','arvyak-ryaz-main','bolshoy-shatak-avzyan','kushay-abzakovo']:
   coords=ref['geometry']['coordinates'][0];assert len(ref['geometry']['coordinates'])==1;row['geometrySource']='source_gpx';row['downloadUrl']=ref['properties']['sourceFile'];provenance={**ref['properties'],'method':'Owner archive GPX reference, kept without linear gap closing'};row['buildStatus']='ready'
   if rid=='arvyak-ryaz-main':
    row['buildStatus']='partial';reason.append('Начало GPX в 79 м от принятого старта; исходное кольцо не замкнуто (39 м). Подходы рассчитаны по дорожной сети и показаны отдельными участками; остаточные разрывы между GPX и привязкой не соединены прямыми.');row['geometrySource']='mixed_gpx_osm';row['geometrySourceLabel']='Исходный GPX и отдельные подходы по пешеходной сети';
    for connector in ['arvyak-start-connection','arvyak-end-connection']:
     if routing.get(connector,{}).get('httpStatus')==200:extra_lines.append(read(DATA/'routing'/(connector+'.json'))['features'][0]['geometry']['coordinates'])
    provenance['connectors']=[routing.get(k) for k in ['arvyak-start-connection','arvyak-end-connection']]
   if rid=='kushay-abzakovo':
    row['geometrySourceLabel']='Участок опубликованного трека Большой Южно-Уральской тропы (сегмент «Кусимово — Новоабзаково»).';row['sourceUrl']=ref['properties']['sourcePage'];row['description']='Подъём на Кушай от точки входа в Новоабзаково по маркированной Большой Южно-Уральской тропе: лесные дороги вдоль рек Ахтан и Катауелга, броды, затем гребень мимо Сундука и Бабая. Возвращение тем же путём.';provenance['method']='Published BYuUT GPX section, reversed to start at Novoabzakovo; Douglas-Peucker 6 m'
   if rid=='bolshoy-shatak-avzyan':
    row['buildStatus']='partial';row['days']=2;row['stampAvailable']=False;reason.append('Показан путь до конца опубликованного GPX и обратно. Отдельный маркер вершины Яндекса находится примерно в 459 м; соединение не подтверждено.');p=point('shatak-yandex','reference');routepoints.append(p)
   if rid=='arvyak-ryaz-main':
    for i,name in [(0,'Начало исходного GPX'),(-1,'Конец исходного GPX — разрыв кольца')]:routepoints.append({'id':rid+str(i),'name':name,'coordinates':coords[i][:2],'role':'reference','precision':'gpx_endpoint'})
 else:reason.append('Точный старт, цель или полная пешая линия пока не подтверждены источниками.')
 # These are unknown editorial variants: keeping all nulls is intentional.
 if not coords and not reason:reason.append('Полная линия не получена из доступных источников.')
 if not coords and not row.get('placeOnly'):row['placeOnly']=True
 row['editorialStatus']=r['status'];row['status']=row['buildStatus'];row['statusReason']=' '.join(reason);row['publicReady']=row['buildStatus']=='ready';row['hasGeometry']=bool(coords);row['points']=routepoints
 if coords:
  one=length(coords)+sum(length(c) for c in extra_lines);row['lineDistanceM']=round(one);row['distanceM']=round(one*(2 if r['tripType']=='out_and_back' else 1));row['distanceLabel']='Туда и обратно' if r['tripType']=='out_and_back' else 'Весь переход' if r['tripType']=='point_to_point' else 'Доступная линия GPX' if row['buildStatus']=='partial' else 'Весь маршрут'
  if rid=='bolshoy-shatak-avzyan':row['distanceLabel']='До конца GPX и обратно'
  if row['buildStatus']=='partial' and rid not in ['arvyak-ryaz-main','bolshoy-shatak-avzyan','small-yamantau-ecotrail']:row['distanceLabel']='Расчётная часть пути и обратно'
  if rid=='small-yamantau-ecotrail':row['distanceLabel']='По прямой между точками, туда и обратно'
  row['bounds']=bounds(coords+[c for line in extra_lines for c in line]+[p['coordinates'] for p in routepoints]);features.append({'type':'Feature','id':rid,'properties':{'id':rid,'routeId':rid,'originalStartPointId':r['startPointId'],'originalGoalPointId':r['goalPointId'],'placeId':row['placeId'],'mapPlaceId':row['mapPlaceId'],'name':row['title'],'color':row['color'],'buildStatus':row['buildStatus'],'distanceM':row['distanceM']},'geometry':{'type':'MultiLineString' if extra_lines else 'LineString','coordinates':[extra_lines[0],coords,*extra_lines[1:]] if extra_lines else coords}})
 else:row['bounds']=bounds([p['coordinates'] for p in routepoints]);row['distanceM']=None;row['lineDistanceM']=None;row['distanceLabel']=None
 row.pop('geometry',None);row['sourceGeometrySha256']=hashlib.sha256(json.dumps(coords,separators=(',',':')).encode()).hexdigest() if coords else None
 rows.append(row);audit.append({'routeId':rid,'buildStatus':row['buildStatus'],'reason':row['statusReason'],'provenance':provenance})
groups=[{**p,'mapPlaceId':PLACE_ALIASES.get(p['placeId'],p['placeId'])} for p in x['places']]
write(OUT/'routes.geojson',{'type':'FeatureCollection','features':features});write(ROOT/'src/region/direction-catalog.json',{'schemaVersion':1,'revision':1,'checkedAt':DATE,'places':groups,'routes':rows});write(DATA/'build-audit.json',{'checkedAt':DATE,'inputSha256':hashlib.sha256((DATA/'input/routes.json').read_bytes()).hexdigest(),'routes':audit});print('Directions:',len(rows),'records;',sum(r['publicReady'] for r in rows),'ready;',sum(r['buildStatus']=='partial' for r in rows),'partial;',sum(not r['hasGeometry'] for r in rows),'points only')
