from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
def compact(layer):
 data=json.loads((r/f'public/live/{layer}.geojson').read_text());result=[]
 for f in data['features']:
  p=f['properties']
  if f['geometry']['type']!='LineString' or (layer=='trails' and not p['name'].startswith(('Ю','С'))):continue
  result.append({'n':p['name'],'id':p['id'],'c':[[round(c[0],6),round(c[1],6)] for c in f['geometry']['coordinates']]})
 return json.dumps(result,ensure_ascii=False,separators=(',',':'))
html='''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Мраткино — живая 3D-карта</title>
<link href="https://cdn.jsdelivr.net/npm/maplibre-gl@5.13.0/dist/maplibre-gl.css" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;padding:18px;font:14px Arial,sans-serif;background:#f5f8f2;color:#284939}main{max-width:1200px;margin:auto;border:1px solid #dbe4d3;border-radius:16px;overflow:hidden;background:white}header{padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:15px}h1{font-size:32px;letter-spacing:-1px;margin:0 0 6px;font-weight:500}header p{margin:0;color:#7b8c70;font-size:12px}.tabs{display:flex;gap:4px;flex-wrap:wrap}button{font:inherit;cursor:pointer;border:1px solid #dce4d5;border-radius:7px;background:#f5f8f0;color:#36523b;padding:11px 14px}.tabs button[aria-pressed=true]{background:#2f5140;color:white;border-color:#2f5140}button:focus-visible,a:focus-visible{outline:3px solid #b87d42;outline-offset:3px}.map-wrap{position:relative;height:70vh;min-height:430px;background:#e9efe6}#map{position:absolute;inset:0}#notice{position:absolute;top:15px;left:15px;right:65px;z-index:2;background:#fffffff0;border-radius:8px;padding:12px 15px;font-size:12px;line-height:1.6;pointer-events:none}#card{position:absolute;bottom:35px;left:15px;max-width:300px;background:#fffffff2;padding:15px;border-radius:10px;z-index:2;font-size:12px;line-height:1.7;box-shadow:0 5px 25px #29443815}#card h2{font-size:18px;margin:0 0 7px;font-weight:500}#card p{margin:5px 0;color:#748566}#card a{color:#315740}#card button{margin-top:8px;font-size:11px;padding:8px 10px}.labels{background:white;border:1px solid #c89d80;color:#925e43;border-radius:5px;padding:4px 6px;font-size:11px;font-weight:bold;cursor:pointer}.bottom{padding:16px 22px;font-size:11px;line-height:1.8;color:#7c8d70}.bottom label{display:inline-flex;align-items:center;gap:7px;margin-right:18px}.bottom p{margin:7px 0 0}.maplibregl-ctrl-attrib{font-size:9px!important}.map-wrap:fullscreen{height:100vh;width:100vw}@media(max-width:650px){body{padding:6px}header{display:block;padding:16px}.tabs{margin-top:16px}.tabs button{font-size:11px;padding:10px}h1{font-size:28px}.map-wrap{height:66vh;min-height:420px}#card{max-width:240px;font-size:10px;padding:12px}#card h2{font-size:16px}.bottom{padding:13px}#notice{font-size:10px}}
</style>
</head>
<body>
<main>
<header><div><h1>Мраткино</h1><p>Интерактивная 3D-карта · Белорецк</p></div><div class="tabs"><button data-view="south" aria-pressed="true">Южный склон</button><button data-view="north" aria-pressed="false">Северный склон</button><button data-view="all" aria-pressed="false">Общий вид</button></div></header>
<div class="map-wrap"><div id="map"></div><div id="notice">Загружаем карту. Нужен интернет: MapLibre, Mapterhorn и OpenFreeMap.</div><section id="card"><h2>Выберите трассу</h2><p>Нажмите подпись или линию.</p><p>Правая кнопка мыши — вращение и наклон. На телефоне — два пальца. Ctrl + колесо — масштаб.</p></section></div>
<div class="bottom"><label><input id="lift-toggle" type="checkbox" checked>Подъёмники</label><label><input id="forest-toggle" type="checkbox" checked>Лес</label><p>7 названных линий OSM. Ю5 исключена по уточнению владельца; у Ю3 конфликт name=Ю3 / ref=Ю2. Характеристики требуют сверки курортом. Цвет линий не означает сложность. Снег — оформление, не текущие условия.</p><p>© OpenStreetMap contributors / ODbL · OpenFreeMap / OpenMapTiles · Рельеф: © Mapterhorn. <a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">Источники высот</a>.</p></div>
</main>
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5.13.0/dist/maplibre-gl.js" onerror="document.getElementById('notice').textContent='Не загрузился MapLibre. Проверьте интернет и доступ к cdn.jsdelivr.net.'"></script>
<script>
(function(){
const trails=TRAIL_DATA;
const lifts=LIFT_DATA;
const summit=[58.4371909,53.9974603];
const notice=document.getElementById('notice');
if(!window.maplibregl)return;
function geo(items){return {type:'FeatureCollection',features:items.map(o=>({type:'Feature',properties:{name:o.n,id:o.id},geometry:{type:'LineString',coordinates:o.c}}))};}
let map;
try{
map=new maplibregl.Map({container:'map',center:[58.4405,54.0017],zoom:14.4,pitch:60,bearing:-67.57,minZoom:12.5,maxZoom:17,maxPitch:72,maxBounds:[[58.39,53.97],[58.485,54.026]],cooperativeGestures:true,style:{version:8,sources:{
dem:{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json',tileSize:512,encoding:'terrarium',maxzoom:12},
shade:{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json',tileSize:512,encoding:'terrarium',maxzoom:12},
base:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors'},
trails:{type:'geojson',data:geo(trails)},lifts:{type:'geojson',data:geo(lifts)}
},terrain:{source:'dem',exaggeration:1},layers:[
{id:'snow',type:'background',paint:{'background-color':'#f5f8f3'}},
{id:'forest',type:'fill',source:'base','source-layer':'landcover',filter:['==',['get','class'],'wood'],paint:{'fill-color':'#6b8d78','fill-opacity':.8}},
{id:'hillshade',type:'hillshade',source:'shade',paint:{'hillshade-shadow-color':'#6a849a','hillshade-highlight-color':'#fff','hillshade-accent-color':'#8eaaa4','hillshade-exaggeration':.6}},
{id:'trail-white',type:'line',source:'trails',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':7}},
{id:'trails',type:'line',source:'trails',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#bb7452','line-width':3}},
{id:'lifts',type:'line',source:'lifts',paint:{'line-color':'#675a91','line-width':2.5,'line-dasharray':[2,2]}}
]}});
}catch(e){notice.textContent='Не удалось запустить WebGL: '+e.message;return;}
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
map.addControl(new maplibregl.FullscreenControl({container:document.querySelector('.map-wrap')}),'top-right');
map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-right');
let hadError=false;
map.on('error',e=>{hadError=true;notice.hidden=false;notice.textContent='Часть карты не загрузилась: '+(e.error?.message||'ошибка источника')+'. Проверьте доступ к CDN и сервисам тайлов.';});
function bounds(items){const p=items.flatMap(o=>o.c);return [[Math.min(...p.map(p=>p[0])),Math.min(...p.map(p=>p[1]))],[Math.max(...p.map(p=>p[0])),Math.max(...p.map(p=>p[1]))]];}
function bearing(a,b){const r=Math.PI/180,d=(b[0]-a[0])*r,x=a[1]*r,y=b[1]*r;return Math.atan2(Math.sin(d)*Math.cos(y),Math.cos(x)*Math.sin(y)-Math.sin(x)*Math.cos(y)*Math.cos(d))/r;}
function view(side,animate=true){
const items=side==='all'?trails:trails.filter(t=>t.n.startsWith(side==='south'?'Ю':'С'));
const bottoms=items.map(t=>{const a=t.c[0],b=t.c[t.c.length-1],dist=p=>Math.hypot((p[0]-summit[0])*.588,p[1]-summit[1]);return dist(a)>dist(b)?a:b;});
const base=bottoms.reduce((s,p)=>[s[0]+p[0]/bottoms.length,s[1]+p[1]/bottoms.length],[0,0]);
const direction=side==='all'?-67.57:bearing(base,summit);
const camera=map.cameraForBounds(bounds(items),{bearing:direction,padding:55,maxZoom:15.5});
map.stop();map.easeTo({...camera,bearing:direction,pitch:side==='all'?55:60,duration:animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?1200:0});
document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===side)));
}
function select(t){
const card=document.getElementById('card');card.replaceChildren();const h=document.createElement('h2');h.textContent='Трасса '+t.n;card.append(h);
const p=document.createElement('p');p.textContent='Данные OSM, не сверено курортом. Длина, перепад и сложность требуют уточнения.';card.append(p);
if(t.n==='Ю3'){const w=document.createElement('p');w.textContent='Внимание: name=Ю3, но ref=Ю2. Требуется проверка.';card.append(w);}
const a=document.createElement('a');a.href='https://www.openstreetmap.org/'+t.id;a.target='_blank';a.rel='noopener';a.textContent='Исходный объект OSM';card.append(a);
const button=document.createElement('button');button.textContent='Показать ближе';button.onclick=()=>{const c=map.cameraForBounds(bounds([t]),{padding:65,maxZoom:15.8});map.stop();map.easeTo({...c,pitch:60,duration:1000});};card.append(button);
map.setPaintProperty('trails','line-opacity',['case',['==',['get','id'],t.id],1,.35]);map.setPaintProperty('trails','line-width',['case',['==',['get','id'],t.id],5,2.5]);
}
map.on('load',()=>{
view('south',false);
for(const t of trails){const b=document.createElement('button');b.className='labels';b.textContent=t.n+(t.n==='Ю3'?' !':'');b.onclick=()=>select(t);new maplibregl.Marker({element:b}).setLngLat(t.c[Math.floor(t.c.length/2)]).addTo(map);}
if(!hadError)notice.hidden=true;
});
map.on('click','trails',e=>{const t=trails.find(t=>t.id===e.features[0].properties.id);if(t)select(t);});
map.on('mouseenter','trails',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','trails',()=>map.getCanvas().style.cursor='');
map.on('mousedown',e=>{if(e.originalEvent?.isTrusted)map.stop();});map.on('touchstart',e=>{if(e.originalEvent?.isTrusted)map.stop();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(map.getLayer('trails'))view(b.dataset.view);});
document.getElementById('lift-toggle').onchange=e=>{if(map.getLayer('lifts'))map.setLayoutProperty('lifts','visibility',e.target.checked?'visible':'none');};
document.getElementById('forest-toggle').onchange=e=>{if(map.getLayer('forest'))map.setLayoutProperty('forest','visibility',e.target.checked?'visible':'none');};
new ResizeObserver(()=>map.resize()).observe(document.querySelector('.map-wrap'));
})();
</script>
</body>
</html>'''.replace('TRAIL_DATA',compact('trails')).replace('LIFT_DATA',compact('lifts'))
(r/'deliverables/mratkino-browser-lite.html').write_text(html)
print('Lite HTML',len(html.encode()),'bytes')
