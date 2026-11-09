/* Visit Beloretsk unified engine/filter switch. Origin-bound vb3d v1. */
(function(){
 'use strict';
 const script=document.currentScript,scope=script?.vbScope||document,bus=scope===document?window:scope,config=script?.dataset||{},mapURL=new URL(config.mapUrl||'https://poletavkinvladislav2025-dot.github.io/mratkino-3d-map/preview/unified/',document.baseURI).href;
 const note=document.createElement('div');note.id='vb-map-link-note';note.setAttribute('role','status');note.textContent='Подключаем карты…';script.before(note);const sourceRecord=scope===document?script.closest('.t-rec'):null;
 let attempts=0;
 function init(){
  const host=scope.querySelector('.vb-t1__map');if(!host){if(++attempts<40)return setTimeout(init,250);note.textContent='Не найден существующий блок Яндекс.Карты.';return;}
  if(scope.getElementById('vb-map-modes')){note.textContent='Замените прежний переключатель в T123 и обновите опубликованную страницу.';return;}
  const root=host.closest('.vb-t1');root?.classList.add('vb-unified-root');
  const style=document.createElement('style');style.textContent=`
#vb-map-modes{display:flex;align-items:center;flex-wrap:wrap;gap:12px 20px;margin:0 0 14px;font:13px Arial,sans-serif;color:#234b38}
#vb-map-modes .vb-mode-group,#vb-map-modes .vb-filter-group{display:flex;gap:4px;align-items:center}
#vb-map-modes .vb-mode-group{padding:4px;border:1px solid #d2dfd4;border-radius:15px;background:#e8eee7}
#vb-map-modes button{min-height:44px;padding:8px 14px;border:1px solid transparent;border-radius:10px;color:#29543b;background:transparent;font:inherit;cursor:pointer}
#vb-map-modes .vb-mode-group button{font-weight:600}
#vb-map-modes .vb-mode-group button[aria-pressed=true]{background:#17623f;color:#fff;border-color:#17623f;box-shadow:0 2px 5px #193f2820}
#vb-map-modes .vb-filter-group button{border-radius:22px;border-color:#d9e4d8;background:#fff}
#vb-map-modes .vb-filter-group button[aria-pressed=true]{background:#e7efe2;color:#234b38;border-color:#9db798;font-weight:600}
#vb-map-modes button:hover{background:#dbe6d8}
#vb-map-modes .vb-mode-group button[aria-pressed=true]:hover{background:#125333}
#vb-map-modes button:focus-visible,#vb-map-modes select:focus-visible{outline:3px solid #bd854b;outline-offset:2px}
#vb-map-modes select{display:none;min-width:0;height:44px;padding:7px;border:1px solid #d4dfd0;border-radius:22px;color:#28503a;background:#fff;font:inherit}
#vb-map-modes .vb-short{display:none}.vb-unified-root .vb-t1__tabs{display:none!important}
#vb-map-link-note{font:13px/1.5 Arial,sans-serif;color:#3d604b}#vb-map-link-note:empty{display:none}
.vb-map-unified-frame{position:absolute;inset:0;width:100%;height:100%;display:block;border:0;z-index:100;background:#f4f7f2}.vb-map-unified-frame[hidden]{display:none!important}.vb-map-unified-3d>:not(.vb-map-unified-frame){visibility:hidden!important;pointer-events:none!important}
@media(max-width:640px){#vb-map-modes{flex-wrap:nowrap;gap:10px;font-size:12px}#vb-map-modes .vb-filter-group,#vb-map-modes .vb-full{display:none}#vb-map-modes .vb-short{display:inline}#vb-map-modes .vb-mode-group{flex:none}#vb-map-modes button{padding:8px 10px}#vb-map-modes select{display:block;flex:1;width:100%;font-size:16px}}
@media(max-width:340px){#vb-map-modes{flex-wrap:wrap}#vb-map-modes .vb-mode-group{width:100%}#vb-map-modes .vb-mode-group button{flex:1}#vb-map-modes .vb-full{display:inline}#vb-map-modes .vb-short{display:none}#vb-map-modes select{flex-basis:100%}}`;
  (scope===document?document.head:scope).append(style);
  const origin=new URL(mapURL).origin,url=new URL(mapURL);url.searchParams.set('place',config.place||'all');if(config.route)url.searchParams.set('route',config.route);if(config.autoFit==='false')url.searchParams.set('autoFit','false');url.searchParams.set('embed','1');url.searchParams.set('externalSearch','1');url.searchParams.set('parentOrigin',location.origin);
  const bar=document.createElement('div');bar.id='vb-map-modes';bar.setAttribute('aria-label','Режим и объекты карты');
  const modes=document.createElement('div'),filters=document.createElement('div'),select=document.createElement('select');modes.className='vb-mode-group';modes.setAttribute('role','group');modes.setAttribute('aria-label','Способ отображения');filters.className='vb-filter-group';filters.setAttribute('role','group');filters.setAttribute('aria-label','Показать на карте');select.setAttribute('aria-label','Показать на карте');
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label);b.addEventListener('click',fn);return b;};
  const ordinary=button('Карта',()=>show('yandex')),three=button('3D-карта',()=>show('3d'));
  ordinary.innerHTML='<span class="vb-full">Карта</span><span class="vb-short">Карта</span>';three.innerHTML='<span class="vb-full">3D-карта</span><span class="vb-short">3D</span>';modes.append(ordinary,three);
  const views={places:'Места',stamps:'Где поставить штамп',passport:'Где купить паспорт'},viewButtons={};
  for(const [view,label] of Object.entries(views)){const b=button(label,()=>setView(view));b.dataset.filter=view;filters.append(b);viewButtons[view]=b;const option=document.createElement('option');option.value=view;option.textContent=label;select.append(option);}
  select.addEventListener('change',()=>setView(select.value));bar.append(modes,filters,select);host.before(bar);bar.after(note);
  const children=Array.from(host.children).map(el=>({el,inert:el.inert,aria:el.getAttribute('aria-hidden')}));
  const frame=document.createElement('iframe');frame.className='vb-map-unified-frame';frame.title='3D-карта Visit Beloretsk';frame.allow='fullscreen';frame.allowFullscreen=true;frame.hidden=true;host.append(frame);
  const toSource={malinovaya:'malinovaya1','malinovaya-3':'malinovaya',iremel:'bigIremel','inzerskie-zubchatki':'inzerskieZubchatki','maly-yamantau':'smallYamantau','arvyak-ryaz':'arvyakRyaz','arskiy-kamen':'arskiyKamen','sinie-skaly':'blueSky','kamennaya-rechka':'stoneyRiver'};
  let mode=config.defaultMode==='3d'?'3d':'yandex',view=location.hash==='#map-stamps'?'stamps':Object.hasOwn(views,config.view)?config.view:'places',selected=config.place&&config.place!=='all'?(toSource[config.place]||config.place):null,selectedRoute=config.route||null,routeList=[],placeList=scope.vbPlaces||[],ready=false,loaded=false,sequence=0,internal=false,slowTimer,pendingFocus=false,layoutPending=false,activation=0;
  if(view!=='places'){selected=null;selectedRoute=null;}
  const adapter=()=>bus.VisitBeloretskYandex?.version===1?bus.VisitBeloretskYandex:null;
  const searchBar=document.createElement('div');searchBar.className='vb-map-search';
  const searchBox=document.createElement('div');searchBox.className='vb-search-box';
  const searchInput=document.createElement('input');searchInput.type='search';searchInput.placeholder='Найти место или маршрут…';searchInput.setAttribute('aria-label','Найти место или маршрут');searchInput.setAttribute('role','combobox');searchInput.setAttribute('aria-autocomplete','list');searchInput.setAttribute('aria-expanded','false');searchInput.setAttribute('aria-controls','vb-search-results');searchInput.autocomplete='off';
  const results=document.createElement('div');results.id='vb-search-results';results.className='vb-search-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','Места и маршруты');results.hidden=true;
  const overview=button('Все места',()=>{if(scopedPlace()){chooseRoute(selectedRoute||config.route);return;}selected=null;selectedRoute=null;pendingFocus=true;searchInput.value='';closeSearch();draw();if(mode==='3d'){if(ready&&!layoutPending)apply3D();}else applyYandex(true);});overview.className='vb-search-reset';overview.setAttribute('aria-label','Общий вид карты');
  const trails=document.createElement('details');trails.className='vb-trails';const summary=document.createElement('summary');summary.textContent='Тропы';trails.append(summary);const trailList=document.createElement('div');trailList.className='vb-trails-list';trails.append(trailList);
  overview.innerHTML='<span aria-hidden="true">↺</span><span class="vb-reset-text">Все места</span>';
  searchBox.append(searchInput,results);searchBar.append(searchBox,overview,trails);host.before(searchBar);
  // One compact toolbar: view switch, filters, search and reset.
  if(matchMedia('(max-width:640px)').matches)searchInput.placeholder='Место или маршрут…';
  const toolbar=document.createElement('div');toolbar.className='vb-map-toolbar';bar.before(toolbar);toolbar.append(bar,searchBar);toolbar.after(note);
  const uiStyle=document.createElement('style');uiStyle.textContent=`
.vb-map-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;margin:0 0 14px;position:relative;z-index:300}
.vb-map-toolbar #vb-map-modes,.vb-map-toolbar .vb-map-search{margin:0}
.vb-map-toolbar #vb-map-modes{gap:10px}
.vb-map-toolbar .vb-map-search{flex:1 1 380px;min-width:0}
.vb-map-toolbar .vb-search-box{max-width:none}
.vb-map-toolbar .vb-search-box input{height:44px;border-color:#d5ddd6;border-radius:12px;color:#193c30}
.vb-map-toolbar .vb-search-box input:focus{outline-color:#193c30}
#vb-map-modes .vb-mode-group{padding:3px;border-color:#d5ddd6;border-radius:12px;background:#eef2ee}
#vb-map-modes .vb-mode-group button{min-height:38px;padding:6px 14px;color:#193c30}
#vb-map-modes .vb-mode-group button[aria-pressed=true],#vb-map-modes .vb-mode-group button[aria-pressed=true]:hover{background:#193c30;border-color:#193c30;color:#fff}
#vb-map-modes .vb-filter-group button{min-height:40px;padding:6px 14px;border-color:#d5ddd6;color:#193c30;background:#fff}
#vb-map-modes .vb-filter-group button[aria-pressed=true]{background:#e6ece7;border-color:#193c30;color:#193c30}
#vb-map-modes .vb-filter-group button:is([data-filter=stamps],[data-filter=passport]){background:#f7f0e1;border-color:#e2d2ad;color:#7c5c1b}
#vb-map-modes .vb-filter-group button:is([data-filter=stamps],[data-filter=passport]):hover{background:#efe3c6}
#vb-map-modes .vb-filter-group button:is([data-filter=stamps],[data-filter=passport])[aria-pressed=true]{background:#9a7426;border-color:#9a7426;color:#fff}
.vb-map-toolbar .vb-map-search>button,.vb-map-toolbar .vb-trails summary{min-height:44px;padding:8px 12px;border-color:#d5ddd6;color:#193c30;white-space:nowrap}
.vb-map-toolbar .vb-search-reset{display:inline-flex;align-items:center;gap:6px;max-width:none}
.vb-r-map-context{display:none!important}
@media(max-width:640px){.vb-map-toolbar{gap:8px;margin-bottom:10px}.vb-map-toolbar #vb-map-modes{flex:1 1 100%}.vb-map-toolbar .vb-map-search{flex:1 1 100%;flex-wrap:nowrap;gap:6px}.vb-map-toolbar .vb-search-box{flex:1 1 auto;min-width:0}.vb-map-toolbar .vb-search-reset{flex:none;width:44px;padding:0;justify-content:center;font-size:18px}.vb-map-toolbar .vb-reset-text{display:none}}
`;(scope===document?document.head:scope).append(uiStyle);
  // Site header (outside the map): the closed mobile menu must not take taps from the map below it.
  if(!document.getElementById('vb-header-nav-fix')){const fix=document.createElement('style');fix.id='vb-header-nav-fix';fix.textContent='@media(max-width:1100px){.vb-header__nav{pointer-events:none}}@media(min-width:961px) and (max-width:1100px){.vb-header__menu{pointer-events:auto}}';document.head.append(fix);}
  let resultIndex=-1;
  function closeSearch(){results.hidden=true;searchInput.setAttribute('aria-expanded','false');searchInput.removeAttribute('aria-activedescendant');resultIndex=-1;}
  function choosePlace(id){if(scopedPlace()){const r=selectedRouteMeta();if(r){chooseRoute(r.id);return;}}selected=id;selectedRoute=null;pendingFocus=false;closeSearch();searchInput.value='';draw();if(mode==='3d'){if(ready&&!layoutPending)apply3D();}else applyYandex(false);}
  function searchDraw(){
   if(results.hidden)return;results.replaceChildren();resultIndex=-1;searchInput.removeAttribute('aria-activedescendant');
   const normalize=x=>x.toLocaleLowerCase('ru').replaceAll('ё','е'),q=normalize(searchInput.value.trim());
   const places=placeList.filter(p=>!scopedPlace()||p.canonicalId===(selectedRouteMeta()?.mapPlaceId||scopedPlace())).filter(p=>(view==='places'?p.kind!=='stamp-point':p.kind==='stamp-point'&&(view!=='passport'||p.sellsPassports))&&(!q||normalize(p.name).includes(q))).map(p=>({label:p.name,detail:p.type||'Место',run:()=>choosePlace(p.id)}));
   const routes=view==='places'?routeList.filter(r=>!scopedPlace()||r.placeId===scopedPlace()).filter(r=>q?normalize(r.title+' '+(placeList.find(p=>p.canonicalId===(r.mapPlaceId||r.placeId))?.name||'')).includes(q):r.placeId==='all').map(r=>({label:r.title+(r.buildStatus&&r.buildStatus!=='ready'?' · '+(r.hasGeometry?'неполный':'только точки'):''),detail:r.placeId==='all'?'Длинная тропа':placeList.find(p=>p.canonicalId===(r.mapPlaceId||r.placeId))?.name||'Маршрут',run:()=>chooseRoute(r.id)})):[];
   const items=[...places.slice(0,8),...routes.slice(0,12)];
   for(const [i,item] of items.entries()){const row=button('',item.run);row.setAttribute('role','option');row.setAttribute('aria-selected','false');row.id='vb-result-'+i;row.tabIndex=-1;const title=document.createElement('strong'),detail=document.createElement('small');title.textContent=item.label;detail.textContent=item.detail;row.append(title,detail);results.append(row);}
   if(!items.length){const empty=document.createElement('p');empty.textContent='Ничего не найдено. Попробуйте другое название.';results.append(empty);}
  }
  function openSearch(){results.hidden=false;searchInput.setAttribute('aria-expanded','true');searchDraw();}
  searchInput.addEventListener('focus',openSearch);searchInput.addEventListener('input',openSearch);
  searchInput.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSearch();return;}if(!['ArrowDown','ArrowUp','Enter'].includes(e.key))return;const rows=[...results.querySelectorAll('[role=option]')];if(!rows.length)return;e.preventDefault();if(e.key==='Enter'){rows[Math.max(0,resultIndex)]?.click();return;}resultIndex=resultIndex<0?(e.key==='ArrowDown'?0:rows.length-1):(resultIndex+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows.forEach((r,i)=>r.setAttribute('aria-selected',String(i===resultIndex)));searchInput.setAttribute('aria-activedescendant',rows[resultIndex].id);rows[resultIndex].scrollIntoView({block:'nearest'});});
  scope.addEventListener('pointerdown',e=>{if(!searchBar.contains(e.target))closeSearch();if(!trails.contains(e.target))trails.open=false;});
  trails.addEventListener('toggle',()=>{if(trails.open)closeSearch();});
  if(!placeList.length)fetch(new URL('map-catalog.json',script.src)).then(r=>r.json()).then(d=>{placeList=d;draw();}).catch(()=>{});
  const routeCard=document.createElement('section');routeCard.className='vb-route-detail';routeCard.hidden=true;routeCard.setAttribute('aria-label','Описание маршрута');host.append(routeCard);
  const routeStyle=document.createElement('style');routeStyle.textContent='.vb-route-detail{position:absolute;z-index:250;top:16px;right:16px;width:300px;max-height:calc(100% - 32px);overflow:auto;box-sizing:border-box;padding:20px;border:1px solid #d2dfd4;border-radius:16px;background:#fff;box-shadow:0 6px 24px #234b3820;color:#234b38;font:14px/1.6 Arial,sans-serif}.vb-route-detail h3{font-size:20px;line-height:1.3;margin:0 40px 12px 0}.vb-route-detail p{margin:8px 0}.vb-route-status{padding:10px;border-radius:10px;background:#fff4df}.vb-route-variants{margin-top:14px;border-top:1px solid #d2dfd4;padding-top:10px}.vb-route-variants button{display:block;width:100%;text-align:left}.vb-route-variants button[aria-pressed=true]{background:#e3efdf;border-color:#64866b}.vb-route-parent{font-size:12px;color:#6c7e71;padding-right:30px}.vb-route-detail button{margin:4px 4px 0 0}.vb-route-detail button{min-height:44px;padding:8px 12px;border:1px solid #d2dfd4;border-radius:10px;background:#f3f7ef;color:#234b38;font:inherit;cursor:pointer}.vb-route-detail .vb-route-close{position:absolute;top:6px;right:6px;width:44px;font-size:24px;background:#fff;border:0;margin:0}.vb-route-detail a{display:inline-block;color:#17623f;min-height:44px;padding:8px 0;box-sizing:border-box}.vb-route-detail[hidden]{display:none!important}@media(max-width:640px){.vb-route-detail{top:auto;bottom:12px;left:12px;right:12px;width:auto;max-height:45%;padding:16px}}.vb-map-search{display:flex;align-items:center;gap:10px;margin:0 0 14px;font:14px Arial,sans-serif;color:#234b38;position:relative;z-index:300}.vb-search-box{position:relative;flex:1;max-width:600px;min-width:0}.vb-search-box input{box-sizing:border-box;width:100%;height:48px;border:1px solid #ccdcd0;border-radius:14px;background:#fff;color:#234b38;font:16px Arial,sans-serif;padding:10px 16px}.vb-search-box input:focus{outline:2px solid #17623f;outline-offset:2px}.vb-search-results,.vb-trails-list{position:absolute;top:calc(100% + 8px);left:0;right:0;max-height:min(360px,50dvh);overflow:auto;background:white;border:1px solid #d2dfd4;border-radius:14px;box-shadow:0 12px 32px #234b3826;padding:6px;overscroll-behavior:contain}.vb-search-results[hidden]{display:none}.vb-map-search button,.vb-trails summary{min-height:44px;font:inherit;color:inherit;cursor:pointer;border:1px solid #d2dfd4;border-radius:12px;background:#fff;padding:10px 14px}.vb-search-results button{display:flex;flex-direction:column;gap:5px;text-align:left;width:100%;border:0}.vb-search-results button:hover,.vb-search-results button[aria-selected=true]{background:#edf3e9}.vb-search-results small{color:#6c7e71}.vb-search-results p{padding:12px}.vb-search-reset{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vb-trails{position:relative;flex:none}.vb-trails summary{box-sizing:border-box;list-style:none;display:flex;align-items:center}.vb-trails-list{left:auto;width:260px}.vb-trails-list button{display:block;width:100%;text-align:left;border:0}.vb-place-routes{margin:20px 0 0;border-top:1px solid #e0e8dd;padding-top:16px}.vb-place-routes h4{font-size:15px;margin:0 0 10px}.vb-place-routes button{display:block;width:100%;text-align:left;min-height:44px;border:1px solid #d2dfd4;border-left:4px solid var(--route-color,#17623f);background:#f5f8f2;color:#234b38;border-radius:10px;padding:10px 12px;margin:6px 0;font:14px/1.4 Arial,sans-serif;cursor:pointer}.vb-place-routes button:hover{background:#e7efe2}.vb-place-routes button:focus-visible,.vb-map-search button:focus-visible,.vb-trails summary:focus-visible{outline:3px solid #bd854b;outline-offset:2px}@media(max-width:640px){.vb-map-search{flex-wrap:wrap;gap:8px}.vb-search-box{flex-basis:100%;max-width:none}.vb-search-reset{flex:1;max-width:calc(100% - 85px);text-align:left}.vb-trails-list{width:min(280px,75vw)}.vb-t1__mcard{flex-direction:column;touch-action:pan-y}.vb-t1__mcard-bar{touch-action:none;border-top:0;border-bottom:1px solid #e0e8dd}.vb-t1__mcard-body{max-height:110px;overflow:auto}.vb-t1__mcard:not(.vb-t1__mcard--expanded) .vb-t1__gallery{display:none}.vb-t1__mcard--expanded .vb-t1__mcard-body{max-height:min(48dvh,360px)}.vb-route-detail{max-height:48%}}';(scope===document?document.head:scope).append(routeStyle);
  function selectedRouteMeta(){return routeList.find(r=>r.id===selectedRoute||r.aliases?.includes(selectedRoute));}
  function scopedPlace(){return (config.route||config.place&&config.place!=='all')?(selectedRouteMeta()?.placeId||config.place):null;}
  function rememberRoute(id,replace=false){if(!id)return;const r=routeList.find(r=>r.id===id||r.aliases?.includes(id));if(!r?.routeId)return;const u=new URL(location.href);u.searchParams.set('routeId',id);u.searchParams.set('placeId',r.placeId);history[replace?'replaceState':'pushState'](null,'',u);}
  window.addEventListener('popstate',()=>{const id=new URLSearchParams(location.search).get('routeId');if(id&&routeList.some(r=>r.id===id||r.aliases?.includes(id)))chooseRoute(id,false);});
  function routeDraw(){
   const current=selectedRouteMeta(),place=current?placeList.find(p=>p.canonicalId===(current.mapPlaceId||current.placeId)):placeList.find(p=>p.id===selected);
   overview.textContent=current||place?'× '+(place?.name||'')+(current?(place?' · ':'')+current.title:''):(view==='places'?'Все места':'Все точки');overview.title='Вернуться к общему виду';
   if(scopedPlace()){overview.textContent='Весь маршрут';overview.setAttribute('aria-label','Показать весь маршрут');filters.style.display='none';select.style.display='none';trails.hidden=true;}
   scope.vbRouteCatalog=routeList;scope.vbRefreshPlaceRoutes?.();searchDraw();
   trailList.replaceChildren();for(const r of routeList.filter(r=>r.placeId==='all'))trailList.append(button(r.title,()=>{trails.open=false;chooseRoute(r.id);}));
   routeCard.hidden=mode!=='yandex'||!current||view!=='places';if(routeCard.hidden)return;const title=document.createElement('h3'),description=document.createElement('p');title.textContent=current.title;description.textContent=current.description||'';routeCard.replaceChildren();if(place){const parent=document.createElement('p');parent.className='vb-route-parent';parent.textContent=place.name;routeCard.append(parent);}routeCard.append(title,description);
   const displayDistance=current.displayDistanceM??current.distanceM,displayLabel=current.displayDistanceLabel??current.distanceLabel;
   if(displayDistance){const length=document.createElement('p');length.textContent=(displayLabel?displayLabel+': ':'')+'≈ '+(displayDistance/1000).toLocaleString('ru-RU',{maximumFractionDigits:1})+' км';routeCard.append(length);}
   if(current.returnLabel){const returning=document.createElement('p');returning.textContent=current.returnLabel;routeCard.append(returning);}
   if(current.buildStatus&&current.buildStatus!=='ready'){const status=document.createElement('p');status.className='vb-route-status';status.textContent=(current.hasGeometry?'Маршрут неполный. ':'Линия пока не подтверждена. ')+(current.statusReason||'');routeCard.append(status);}
   if(current.days){const days=document.createElement('p');days.textContent='Продолжительность: '+current.days+' дня';routeCard.append(days);}
   if(current.geometrySource){const source=document.createElement('p');source.textContent=current.geometrySourceLabel||(current.geometrySource==='source_gpx'?'Линия из опубликованного GPX':'Расчёт по пешеходной сети OpenStreetMap');routeCard.append(source);}
   if(current.sourceUrl){const source=document.createElement('a');source.href=current.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';source.textContent='Описание и источник ↗';routeCard.append(source);}
   if(current.routeId){const variants=document.createElement('div');variants.className='vb-route-variants';variants.setAttribute('aria-label','Варианты маршрута');for(const r of routeList.filter(r=>r.placeId===current.placeId)){const b=button(r.title+(r.buildStatus&&r.buildStatus!=='ready'?' · '+(r.hasGeometry?'неполный':'только точки'):''),()=>chooseRoute(r.id));b.dataset.routeId=r.id;b.setAttribute('aria-pressed',String(r.id===current.id));variants.append(b);}routeCard.append(variants);}
   if(current.sourcePage){const a=document.createElement('a');a.href=current.sourcePage;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Сайт тропы ↗';routeCard.append(a);}
   const back=current.placeId!=='all'?button('← К месту',()=>{const p=placeList.find(p=>p.canonicalId===(current.mapPlaceId||current.placeId));if(p)choosePlace(p.id);}):null;if(back)routeCard.append(back);
   const fit=button('Весь маршрут',()=>adapter()?.openRoute?.(current.id,{focus:true}));const close=button('×',()=>{if(scopedPlace()){routeCard.hidden=true;return;}selectedRoute=null;adapter()?.setFilter(view);draw();});close.className='vb-route-close';close.setAttribute('aria-label','Закрыть маршрут');routeCard.append(fit,close);
  }
  function chooseRoute(id,remember=true){selectedRoute=routeList.some(r=>r.id===id||r.aliases?.includes(id))?id:null;if(remember)rememberRoute(selectedRoute);view='places';selected=placeList.find(p=>p.canonicalId===(selectedRouteMeta()?.mapPlaceId||selectedRouteMeta()?.placeId))?.id||null;pendingFocus=false;closeSearch();searchInput.value='';draw();if(mode==='3d'){if(ready&&!layoutPending)apply3D();}else applyYandex(false);}
  bus.addEventListener('vb-open-route',e=>chooseRoute(e.detail));
  fetch(new URL('route-catalog.json',script.src)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{routeList=d.routes;bar.dataset.routeCatalog='ready';if(selectedRoute&&!selectedRouteMeta()){selectedRoute=null;note.textContent='Этот маршрут не найден. Найдите другой маршрут через поиск.';}draw();}).catch(()=>{note.textContent='Не удалось загрузить список маршрутов. Обновите страницу.';});

  function send(command,payload={}){if(ready)frame.contentWindow.postMessage({type:'vb3d.command',version:1,id:'tilda-'+(++sequence),command,payload},origin);}
  function eligible(id){const stamp=/^(stampStation|kiosk\d+)$/.test(id);return view==='places'?!stamp:view==='passport'?stamp&&id!=='stampStation':stamp;}
  function draw(){ordinary.setAttribute('aria-pressed',String(mode==='yandex'));three.setAttribute('aria-pressed',String(mode==='3d'));for(const [v,b] of Object.entries(viewButtons))b.setAttribute('aria-pressed',String(view===v));select.value=view;routeDraw();bar.dataset.mode=mode;bar.dataset.filter=view;bar.dataset.routeId=selectedRoute||'';for(const tab of root?.querySelectorAll('.vb-t1__tab')||[]){const active=tab.dataset.tab===(view==='places'?'places':'stamps');tab.setAttribute('aria-selected',String(active));tab.classList.toggle('vb-t1__tab--active',active);}}
  function applyYandex(focus=false){
   const a=adapter();internal=true;try{
    if(a){a.setFilter(view,{focus:!selectedRoute&&focus});if(selectedRoute&&a.openRoute){a.openRoute(selectedRoute,{focus:config.autoFit!=='false'}).catch(()=>{note.textContent='Маршрут временно не загрузился.';});}else if(!focus&&selected&&eligible(selected)&&a.hasPlace(selected))a.openPlace(selected);}
    else if(view!=='passport'){const tab=root?.querySelector('[data-tab="'+(view==='places'?'places':'stamps')+'"]');tab?.click();}
    else note.textContent='Для фильтра покупки паспорта на обычной карте установите небольшой адаптер Яндекса из инструкции.';
   }finally{internal=false;}
  }
  function apply3D(){send('setFilters',{view,ski:view==='places'&&!(scopedPlace()&&selectedRouteMeta()?.routeId),nordic:view==='places'&&!(scopedPlace()&&selectedRouteMeta()?.routeId),hiking:view==='places'});if(selectedRoute){pendingFocus=false;send('openRoute',{routeId:selectedRoute,...(config.autoFit==='false'?{autoFit:false}:{})});return;}if(pendingFocus&&!selected){send('focusView',{view});pendingFocus=false;return;}pendingFocus=false;if(selected&&eligible(selected))send('openPlace',{placeId:adapter()?.canonicalId?.(selected)||'yandex:'+selected});}
  function lifecycle(){send(mode==='3d'&&!document.hidden?'resume':'suspend');if(mode==='3d'&&!document.hidden)send('resize');}
  function setView(next){if(!Object.hasOwn(views,next))return;closeSearch();searchInput.value='';view=next;selected=null;selectedRoute=null;pendingFocus=true;draw();if(mode==='3d'){if(ready&&!layoutPending)apply3D();}else{applyYandex(true);}}
  function show(next){
   if(mode==='yandex'&&next==='3d'){const state=adapter()?.getState();if(state){selected=state.sourceId||null;selectedRoute=state.routeId||null;}}
   const turn=++activation;layoutPending=next==='3d';
   if(next!=='3d')send('suspend');mode=next;host.classList.toggle('vb-map-unified-3d',mode==='3d');frame.hidden=mode!=='3d';
   for(const item of children){item.el.inert=mode==='3d'||item.inert;if(mode==='3d')item.el.setAttribute('aria-hidden','true');else if(item.aria===null)item.el.removeAttribute('aria-hidden');else item.el.setAttribute('aria-hidden',item.aria);}
   if(mode==='3d'&&!loaded){loaded=true;note.textContent='Загружаем 3D-карту…';slowTimer=setTimeout(()=>{if(!ready)note.textContent='Загрузка занимает больше времени. Можно вернуться к обычной карте.';},25000);frame.src=url.href;}
   draw();if(mode==='yandex')applyYandex(!selected);else if(!selected)pendingFocus=true;
   requestAnimationFrame(()=>{if(turn!==activation)return;frame.getBoundingClientRect();lifecycle();layoutPending=false;if(mode==='3d'&&ready)apply3D();if(mode==='yandex')window.dispatchEvent(new Event('resize'));});
  }
  window.addEventListener('message',e=>{
   if(e.origin!==origin||e.source!==frame.contentWindow)return;const m=e.data;if(!m||m.type!=='vb3d.event'||m.version!==1)return;
   if(m.event==='ready'){ready=true;clearTimeout(slowTimer);note.textContent='';lifecycle();if(mode==='3d'&&!layoutPending)apply3D();}
   if(m.event==='filtersChanged'&&Object.hasOwn(views,m.payload?.filters?.view)){view=m.payload.filters.view;draw();}
   if(m.event==='placeSelected'&&typeof m.payload?.placeId==='string'){const id=m.payload.placeId;selectedRoute=null;selected=id==='all'?null:id.startsWith('yandex:')?id.slice(7):toSource[id]||id;draw();}
   if(m.event==='routeSelected'&&typeof m.payload?.routeId==='string'){selectedRoute=m.payload.routeId;rememberRoute(selectedRoute);draw();}
   if(m.event==='error'&&m.payload?.code==='WEBGL_UNAVAILABLE'){clearTimeout(slowTimer);show('yandex');ordinary.focus();note.textContent='3D недоступна в этом браузере. Открыта обычная карта.';}
  });
  for(const tab of root?.querySelectorAll('.vb-t1__tab')||[])tab.addEventListener('click',e=>{if(internal)return;if(mode==='3d'){e.preventDefault();e.stopImmediatePropagation();}view=tab.dataset.tab==='places'?'places':'stamps';draw();if(mode==='3d')setView(view);},true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#map-stamps')setView('stamps');if(location.hash==='#map')setView('places');});
  bus.addEventListener('vb-yandex-change',e=>{if(internal||mode!=='yandex')return;const state=e.detail;if(Object.hasOwn(views,state?.view))view=state.view;selected=typeof state?.sourceId==='string'?state.sourceId:null;const nextRoute=typeof state?.routeId==='string'?state.routeId:null;if(nextRoute&&nextRoute!==selectedRoute)rememberRoute(nextRoute);selectedRoute=nextRoute;draw();});
  bus.addEventListener('vb-yandex-open-3d',()=>show('3d'));
  bus.addEventListener('vb-yandex-routes-error',()=>{note.textContent='Маршруты временно не загрузились. Можно открыть 3D-карту.';});
  bus.addEventListener('vb-yandex-ready',()=>{if(mode==='yandex')applyYandex(!selected);});
  document.addEventListener('visibilitychange',lifecycle);if(window.ResizeObserver)new ResizeObserver(()=>{if(mode==='3d')send('resize');}).observe(host);
  note.textContent='';show(mode);if(sourceRecord&&!sourceRecord.contains(host))sourceRecord.style.display='none';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
