import './style.css';

const arrow = '<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const app = document.querySelector('#app');
app.innerHTML = `
<header class="header"><a class="brand" href="https://visitbeloretsk.ru/" target="_blank" rel="noreferrer">visit<span>beloretsk</span><i>БАШКОРТОСТАН</i></a><span class="header-note">Места, к которым хочется вернуться</span><span class="prototype"><b></b> Исследовательский прототип</span></header>
<main class="page">
  <div class="intro"><div><p class="eyebrow">БЕЛОРЕЦК · ГОРНОЛЫЖНЫЙ ЦЕНТР</p><h1>Мраткино<span>Зима с другой высоты.</span></h1></div><p class="intro-note">Два склона. Одна гора.<br>Исследуйте рельеф, трассы<br>и точки притяжения.</p></div>
  <section class="explorer" aria-label="Интерактивная карта Мраткино">
    <div class="toolbar"><div class="segmented" role="group" aria-label="Ракурс склона"><button class="active" data-view="south" aria-pressed="true">Южный склон <span>Ю</span></button><button data-view="north" aria-pressed="false">Северный склон <span>С</span></button></div><button class="about-button" id="about">ⓘ О данных</button></div>
    <div class="workspace"><div class="map" id="map">
      <div class="map-heading"><span class="map-label">МРАТКИНО / <span id="view-name">ЮЖНЫЙ СКЛОН</span></span><span class="map-caption" id="map-caption">Географическая модель · масштаб высот 1:1</span></div>
      <div id="scene" class="scene" hidden><div id="world" class="world"><img id="render" alt="Рельеф Мраткино по цифровой модели высот"/><svg id="overlay" role="group" aria-label="Трассы, подъёмники и инфраструктура"></svg></div></div>
      <div class="empty" id="empty"><div class="empty-symbol" aria-hidden="true">${arrow}</div><p class="eyebrow">СНАЧАЛА — РЕАЛЬНЫЕ ДАННЫЕ</p><h2>У этой горы<br>есть своя форма.</h2><p id="empty-message">Загружаем состояние модели…</p><button class="primary" id="data-help">Как добавить геоданные <span>${arrow}</span></button><span class="empty-footnote">Без вымышленного рельефа и условных трасс</span></div>
      <div class="map-tools"><button id="zoom-in" aria-label="Увеличить карту" disabled>+</button><button id="zoom-out" aria-label="Уменьшить карту" disabled>−</button><span></span><button id="reset" aria-label="Сбросить масштаб" disabled>↺</button><button id="fullscreen" aria-label="Полноэкранный режим">⛶</button></div>
      <div class="map-bottom"><span class="compass" id="compass" aria-label="Север на изображении не определён">↑<small>N</small></span><span id="model-status">DEM · не загружен</span><span class="attribution" id="attribution">Источники и лицензии — в разделе «О данных»</span></div>
    </div>
    <aside class="sidebar"><div class="sidebar-heading"><h2>Трассы</h2><span id="trail-count">05</span></div><p class="sidebar-sub" id="trail-sub">Южный склон · список для сверки</p><div class="trails" id="trails"></div><div class="trail-info" id="trail-info" aria-live="polite"><span class="tiny-label">ЗНАКОМСТВО С ГОРOЙ</span><h3>Выберите трассу</h3><p>Откройте карточку, чтобы увидеть доступные сведения и статус проверки.</p></div><div class="layers"><h3>Слои карты</h3><label><span><i class="lift-icon">╱</i> Подъёмники</span><input id="lifts-toggle" type="checkbox" checked disabled role="switch"/></label><label><span><i class="facility-icon">⌂</i> Инфраструктура</span><input id="facilities-toggle" type="checkbox" checked disabled role="switch"/></label><p id="layers-note">Ожидаем открытые геоданные</p></div></aside></div>
    <div class="explorer-footer"><span><b class="status-dot"></b><span id="footer-status">Проверяем доступность геоданных</span></span><button id="sources-button">Источники и точность ${arrow}</button></div>
  </section>
  <section class="style-section"><div><p class="eyebrow">ОДНА ГЕОГРАФИЯ · ТРИ НАСТРОЕНИЯ</p><h2>Как вы видите гору?</h2><p>Стиль меняется. Форма реального рельефа остаётся.</p></div><div class="styles" role="group" aria-label="Стиль модели"><button data-style="A" disabled><i class="swatch realistic"></i><span>Реалистичный<small>Снег и мягкий свет</small></span></button><button data-style="B" class="active" disabled><i class="swatch minimal"></i><span>Минималистичный<small>Чистая геометрия</small></span></button><button data-style="C" disabled><i class="swatch illustrated"></i><span>Туристическая панорама<small>Стилизованный рельеф</small></span></button></div></section>
  <p class="research-note">В разработке: это исследовательская карта, а не навигационный инструмент. Названия трасс из задания требуют сверки с актуальными данными курорта. Доступность трасс в реальном времени не отображается.</p>
</main>
<footer class="footer"><span>Visit Beloretsk</span><span>Открываем Южный Урал</span></footer>
<dialog id="data-dialog"><div class="dialog-head"><p class="eyebrow">ПРОИСХОЖДЕНИЕ ДАННЫХ</p><button id="close-dialog" aria-label="Закрыть">×</button></div><h2>Точная гора начинается<br>с открытых данных.</h2><p id="data-status"></p><dl><dt>Рельеф</dt><dd>Copernicus DEM GLO-30, сетка около 30 м. Это модель поверхности: лес и здания могут влиять на высоты. Вертикальный датум — EGM2008, метры. © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. При ручной загрузке GeoTIFF необходимо отдельно проверить единицы высот и вертикальный датум.</dd><dt>Трассы и инфраструктура</dt><dd>© OpenStreetMap contributors, ODbL 1.0. Данные сообщества требуют независимой сверки. Не все восемь трасс могут присутствовать; отсутствующие линии не дорисовываются.</dd><dt>Что ещё не проверено</dt><dd>Актуальные названия, сложность, длины, перепады и режим работы. Изображения из задания не предоставлены. Автоматический экспорт Яндекс Карт не используется.</dd></dl><div class="instructions"><h3>Загрузка модели</h3><p>После применения сетевых настроек выполните из корня проекта:</p><code>python scripts/download_data.py<br>python scripts/prepare_terrain.py<br>python scripts/render_views.py</code><p>Используйте Python из GIS-окружения. Для своего GeoTIFF: <code>download_data.py --geotiff /путь/dem.tif --vertical-reference «проверенный датум, метры»</code>. Подробности и офлайн-режим — в README.md.</p></div><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Условия OpenStreetMap ↗</a></dialog>`;

const $ = (id) => document.getElementById(id);
let view = 'south', style = 'B', zoom = 1, selected = null, projection = null, status = null, loadId = 0;
const catalogue = {south:['Ю1','Ю2','Ю3','Ю4','Ю5'],north:['С1','С2','С3']};
const dialog = $('data-dialog');
for (const id of ['about','data-help','sources-button']) $(id).addEventListener('click', () => dialog.showModal());
$('close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function mappedTrails(){return projection?.layers.trails || [];}
function normalizeName(s){return s.toUpperCase().replace(/[\s-]/g,'').replace(/^C/,'С');}
function trailItems(){
  const mapped=mappedTrails();
  const items=catalogue[view].map(name=>({name, feature:mapped.find(f=>[f.properties.name,f.properties.tags?.ref,f.properties.tags?.['piste:ref']].filter(Boolean).some(v=>normalizeName(v)===name))}));
  for(const f of mapped){const name=f.properties.name;const normalized=normalizeName(name);if(!items.some(i=>i.feature?.id===f.id)&&(!/^[ЮС]\d/.test(normalized)||normalized.startsWith(view==='south'?'Ю':'С')))items.push({name,feature:f});}
  return items;
}
function showCard(item){
  selected=item.feature?.id || item.name;
  const card=$('trail-info');card.replaceChildren();
  const label=document.createElement('span');label.className='tiny-label';label.textContent=item.feature?'ДАННЫЕ OSM · НЕ СВЕРЕНЫ':'ГЕОМЕТРИЯ НЕ ПОДТВЕРЖДЕНА';
  const heading=document.createElement('h3');heading.textContent=`Трасса ${item.name}`;
  const metrics=document.createElement('dl');metrics.className='metrics';
  for(const title of ['Длина','Перепад','Сложность']){const dt=document.createElement('dt');dt.textContent=title;const dd=document.createElement('dd');dd.textContent='Нет проверенных данных';metrics.append(dt,dd);}
  const note=document.createElement('p');note.textContent=item.feature?'Линия взята из OpenStreetMap. Её название, положение и характеристики требуют проверки по данным курорта.':'Название указано в задании. До получения проверяемой геометрии линия на карте не отображается.';
  card.append(label,heading,metrics,note);
  if(item.feature){const a=document.createElement('a');a.href=`https://www.openstreetmap.org/${item.feature.properties.osm_id}`;a.target='_blank';a.rel='noreferrer';a.textContent='Посмотреть объект в OSM ↗';card.append(a);}
  refreshSelection();
}
function renderList(){
  const list=$('trails');list.replaceChildren();const items=trailItems();
  $('trail-count').textContent=String(items.length).padStart(2,'0');
  $('trail-sub').textContent=`${view==='south'?'Южный':'Северный'} склон · ${status?.ready?'данные требуют сверки':'список для сверки'}`;
  for(const item of items){const button=document.createElement('button');button.className='trail-row';button.dataset.key=item.feature?.id||item.name;
    const marker=document.createElement('span');marker.className=`trail-marker ${item.feature?'mapped':''}`;marker.innerHTML=arrow;marker.style.transform='rotate(90deg)';
    const title=document.createElement('strong');title.textContent=item.name;
    const badge=document.createElement('span');badge.className='trail-status';badge.textContent=item.feature?'OSM · не сверено':'Нет геометрии';
    const rowArrow=document.createElement('span');rowArrow.innerHTML='<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';rowArrow.className='row-arrow';button.append(marker,title,badge,rowArrow);
    button.addEventListener('click',()=>showCard(item));
    button.addEventListener('mouseenter',()=>highlight(item.feature?.id));button.addEventListener('mouseleave',()=>highlight(null));
    list.append(button);
  }
  refreshSelection();
}
function refreshSelection(){
  document.querySelectorAll('.trail-row').forEach(b=>{const active=b.dataset.key===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  highlight(null);
}
function highlight(hovered){
  const active=hovered||(mappedTrails().some(f=>f.id===selected)?selected:null);
  document.querySelectorAll('.trail-path').forEach(path=>{path.classList.toggle('highlighted',path.dataset.id===active);path.classList.toggle('dimmed',!!active&&path.dataset.id!==active);});
}
function pathData(geometry){
  let rings=geometry.type==='Polygon'?geometry.coordinates:[geometry.coordinates];
  return rings.map(points=>{let start=true;return points.map(p=>{if(!p||!p[2]){start=true;return '';}const cmd=start?'M':'L';start=false;return `${cmd}${p[0]},${p[1]}`;}).join(' ')+(geometry.type==='Polygon'?' Z':'');}).join(' ');
}
function renderOverlay(){
  const svg=$('overlay');svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${projection.width} ${projection.height}`);
  for(const layer of ['trails','lifts','facilities']){
    const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.dataset.layer=layer;
    for(const f of projection.layers[layer]||[]){
      const geometry=f.geometry;let el;
      if(geometry.type==='Point') {const point=geometry.coordinates;if(!point||!point[2])continue;el=document.createElementNS(svg.namespaceURI,'circle');el.setAttribute('cx',point[0]);el.setAttribute('cy',point[1]);el.setAttribute('r','6');}
      else {el=document.createElementNS(svg.namespaceURI,'path');el.setAttribute('d',pathData(geometry));}
      el.classList.add(`${layer==='trails'?'trail':layer==='lifts'?'lift':'facility'}-path`);
      const title=document.createElementNS(svg.namespaceURI,'title');title.textContent=`${f.properties.name} · OSM, не сверено`;el.append(title);
      if(layer==='trails'){
        el.dataset.id=f.id;el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',title.textContent);
        el.addEventListener('click',()=>showCard({name:f.properties.name,feature:f}));
        el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showCard({name:f.properties.name,feature:f});}});
        el.addEventListener('mouseenter',()=>highlight(f.id));el.addEventListener('mouseleave',()=>highlight(null));
        el.addEventListener('focus',()=>highlight(f.id));el.addEventListener('blur',()=>highlight(null));
      }
      group.append(el);
    }
    svg.append(group);
  }
  for(const layer of ['lifts','facilities']){const toggle=$(`${layer}-toggle`);toggle.disabled=!(projection.layers[layer]?.length);if(toggle.disabled)toggle.checked=false;}
  updateLayers();refreshSelection();
}
function updateLayers(){for(const layer of ['lifts','facilities']){const group=document.querySelector(`[data-layer="${layer}"]`);if(group)group.style.display=$(`${layer}-toggle`).checked?'':'none';}}
for(const layer of ['lifts','facilities'])$(`${layer}-toggle`).addEventListener('change',updateLayers);
async function loadView(){
  if(!status?.ready){renderList();return;}
  const id=++loadId;
  $('map-caption').textContent='Загружаем ракурс…';
  try{
    const r=await fetch(`${import.meta.env.BASE_URL}renders/${style}-${view}.json`);if(!r.ok)throw new Error(`Проекция: HTTP ${r.status}`);
    const next=await r.json();const image=new Image();image.src=`${import.meta.env.BASE_URL}renders/${style}-${view}.png`;await image.decode();
    if(id!==loadId)return;
    projection=next;$('render').src=image.src;$('scene').hidden=false;$('empty').hidden=true;
    $('world').style.aspectRatio=`${next.width}/${next.height}`;
    renderOverlay();renderList();
    $('map-caption').textContent='Реальный DEM · высоты 1:1 · геометрия OSM не сверена';
    $('compass').hidden=true; // A screen north arrow needs a calibrated projection; do not invent one.
  }catch(e){if(id!==loadId)return;$('scene').hidden=true;$('empty').hidden=false;$('empty-message').textContent=`Не удалось открыть рендер: ${e.message}. Выполните рендер заново.`;$('map-caption').textContent='Рендер недоступен';}
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
  view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));});
  $('view-name').textContent=view==='south'?'ЮЖНЫЙ СКЛОН':'СЕВЕРНЫЙ СКЛОН';selected=null;
  $('trail-info').replaceChildren();const note=document.createElement('p');note.textContent='Выберите трассу, чтобы увидеть источник и статус проверки.';$('trail-info').append(note);loadView();
}));
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{style=b.dataset.style;document.querySelectorAll('[data-style]').forEach(x=>x.classList.toggle('active',x===b));loadView();}));
function setZoom(value){zoom=Math.min(2.5,Math.max(1,value));$('world').style.transform=`scale(${zoom})`;$('zoom-in').disabled=zoom>=2.5;$('zoom-out').disabled=zoom<=1;$('reset').disabled=zoom===1;}
$('zoom-in').addEventListener('click',()=>setZoom(zoom+.25));$('zoom-out').addEventListener('click',()=>setZoom(zoom-.25));$('reset').addEventListener('click',()=>setZoom(1));
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('map').requestFullscreen();}catch{$('map-caption').textContent='Полноэкранный режим недоступен в этом браузере';}});
async function init(){
  try{
    const r=await fetch(`${import.meta.env.BASE_URL}data/status.json`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);status=await r.json();
    $('data-status').textContent=status.message+(status.incomplete_requests?.length?' Не получены слои: '+status.incomplete_requests.map(x=>x.layer).join(', ')+'.':'');
    $('empty-message').textContent=status.message;
    $('footer-status').textContent=status.ready?`Реальный DEM · ${status.counts?.trails||0} линий трасс OSM · сведения требуют сверки`:'Геоданные не загружены · точность важнее догадок';
    $('map-caption').textContent=status.ready?'Географическая модель · масштаб высот 1:1':'Рельеф отсутствует · масштаб пока не определён';
    $('compass').hidden=true;
    if(status.ready){
      $('model-status').textContent=`Участок DEM · ${Math.round(status.elevation_range[0])}–${Math.round(status.elevation_range[1])} м`;
      $('attribution').textContent='Copernicus DEM · © OpenStreetMap contributors / ODbL';
      $('layers-note').textContent=`OSM: ${status.counts?.facilities||0} объектов. Лес, трассы и подъёмники: ${(status.counts?.forest||0)+(status.counts?.trails||0)+(status.counts?.lifts||0)}. Данные неполные.`;
      for(const id of ['zoom-in','lifts-toggle','facilities-toggle'])$(id).disabled=false;
      const styles=status.styles||[];if(!styles.includes(style))style=styles[0];
      document.querySelectorAll('[data-style]').forEach(b=>{b.disabled=!styles.includes(b.dataset.style);b.classList.toggle('active',b.dataset.style===style);});
    }
    await loadView();
  }catch(e){$('empty-message').textContent=`Не удалось прочитать состояние данных: ${e.message}`;$('footer-status').textContent='Состояние данных недоступно';$('data-status').textContent=$('empty-message').textContent;renderList();}
}
renderList();init();
