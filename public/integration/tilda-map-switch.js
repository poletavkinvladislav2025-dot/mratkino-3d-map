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
  const origin=new URL(mapURL).origin,url=new URL(mapURL);url.searchParams.set('place',config.place||'all');if(config.route)url.searchParams.set('route',config.route);url.searchParams.set('embed','1');url.searchParams.set('parentOrigin',location.origin);
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
  const placeBar=document.createElement('div');placeBar.className='vb-route-picker';const placeLabel=document.createElement('label');placeLabel.textContent='Место';const placeSelect=document.createElement('select');placeSelect.setAttribute('aria-label','Выбрать место');placeLabel.append(placeSelect);placeBar.append(placeLabel);host.before(placeBar);
  function placeDraw(){const list=placeList.filter(p=>view==='places'?p.kind!=='stamp-point':p.kind==='stamp-point'&&(view!=='passport'||p.sellsPassports));placeSelect.replaceChildren();const all=document.createElement('option');all.value='';all.textContent=view==='places'?'Все места на карте':'Все точки';placeSelect.append(all);for(const p of [...list].sort((a,b)=>a.name.localeCompare(b.name,'ru'))){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;placeSelect.append(o);}placeSelect.value=selected||placeList.find(p=>p.canonicalId===selectedRouteMeta()?.placeId)?.id||'';}
  placeSelect.addEventListener('change',()=>{selected=placeSelect.value||null;selectedRoute=null;pendingFocus=!selected;draw();if(mode==='3d'){if(ready&&!layoutPending)apply3D();}else applyYandex(!selected);});
  if(!placeList.length)fetch(new URL('map-catalog.json',script.src)).then(r=>r.json()).then(d=>{placeList=d;placeDraw();}).catch(()=>{});
  const routeBar=document.createElement('div');routeBar.className='vb-route-picker';routeBar.hidden=true;const routeLabel=document.createElement('label');routeLabel.textContent='Маршрут';const routeSelect=document.createElement('select');routeSelect.setAttribute('aria-label','Выбрать маршрут');routeLabel.append(routeSelect);routeBar.append(routeLabel);host.before(routeBar);
  const routeCard=document.createElement('section');routeCard.className='vb-route-detail';routeCard.hidden=true;routeCard.setAttribute('aria-label','Описание маршрута');host.append(routeCard);
  const routeStyle=document.createElement('style');routeStyle.textContent='.vb-route-picker{margin:0 0 12px;font:13px Arial,sans-serif;color:#234b38}.vb-route-picker label{display:flex;align-items:center;gap:12px}.vb-route-picker select{min-width:0;max-width:560px;width:100%;min-height:44px;padding:10px;border:1px solid #d2dfd4;border-radius:12px;background:#fff;color:#234b38;font:16px Arial,sans-serif}.vb-route-detail{position:absolute;z-index:250;top:16px;right:16px;width:300px;max-height:calc(100% - 32px);overflow:auto;box-sizing:border-box;padding:20px;border:1px solid #d2dfd4;border-radius:16px;background:#fff;box-shadow:0 6px 24px #234b3820;color:#234b38;font:14px/1.6 Arial,sans-serif}.vb-route-detail h3{font-size:20px;line-height:1.3;margin:0 40px 12px 0}.vb-route-detail p{margin:8px 0}.vb-route-detail button{min-height:44px;padding:8px 12px;border:1px solid #d2dfd4;border-radius:10px;background:#f3f7ef;color:#234b38;font:inherit;cursor:pointer}.vb-route-detail .vb-route-close{position:absolute;top:6px;right:6px;width:44px;font-size:24px;background:#fff;border:0}.vb-route-detail a{display:inline-block;color:#17623f;min-height:44px;padding:8px 0;box-sizing:border-box}.vb-route-detail[hidden],.vb-route-picker[hidden]{display:none!important}@media(max-width:640px){.vb-route-picker label{gap:8px}.vb-route-detail{top:auto;bottom:12px;left:12px;right:12px;width:auto;max-height:45%;padding:16px}}';(scope===document?document.head:scope).append(routeStyle);
  function selectedRouteMeta(){return routeList.find(r=>r.id===selectedRoute);}
  function routeDraw(){
   placeDraw();const current=selectedRouteMeta(),context=current?.placeId||adapter()?.canonicalId?.(selected)||placeList.find(p=>p.id===selected)?.canonicalId||'all';routeBar.hidden=view!=='places'||!routeList.length;
   const list=routeList.filter(r=>r.id===selectedRoute||r.placeId===context||r.placeId==='all'||context==='all'&&r.minZoom<=10);routeSelect.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Выберите маршрут';routeSelect.append(empty);
   for(const r of list){const o=document.createElement('option');o.value=r.id;o.textContent=r.title;routeSelect.append(o);}routeSelect.value=selectedRoute||'';
   routeCard.hidden=mode!=='yandex'||!current||view!=='places';if(routeCard.hidden)return;const title=document.createElement('h3'),description=document.createElement('p');title.textContent=current.title;description.textContent=current.description||'';routeCard.replaceChildren(title,description);
   if(current.distanceM){const length=document.createElement('p');length.textContent='≈ '+(current.distanceM/1000).toLocaleString('ru-RU',{maximumFractionDigits:1})+' км';routeCard.append(length);}
   if(current.sourcePage){const a=document.createElement('a');a.href=current.sourcePage;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Сайт тропы ↗';routeCard.append(a);}
   const fit=button('Весь маршрут',()=>adapter()?.openRoute?.(current.id,{focus:true}));const close=button('×',()=>{selectedRoute=null;adapter()?.setFilter(view);draw();});close.className='vb-route-close';close.setAttribute('aria-label','Закрыть маршрут');routeCard.append(fit,close);
  }
  function chooseRoute(id){selectedRoute=routeList.some(r=>r.id===id)?id:null;view='places';selected=null;pendingFocus=false;draw();if(mode==='3d'){if(ready&&!layoutPending)apply3D();}else applyYandex(false);}
  routeSelect.addEventListener('change',()=>chooseRoute(routeSelect.value));
  fetch(new URL('route-catalog.json',script.src)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{routeList=d.routes;if(selectedRoute&&!selectedRouteMeta()){selectedRoute=null;note.textContent='Этот маршрут не найден. Выберите маршрут из списка.';}draw();}).catch(()=>{note.textContent='Не удалось загрузить список маршрутов. Обновите страницу.';});

  function send(command,payload={}){if(ready)frame.contentWindow.postMessage({type:'vb3d.command',version:1,id:'tilda-'+(++sequence),command,payload},origin);}
  function eligible(id){const stamp=/^(stampStation|kiosk\d+)$/.test(id);return view==='places'?!stamp:view==='passport'?stamp&&id!=='stampStation':stamp;}
  function draw(){ordinary.setAttribute('aria-pressed',String(mode==='yandex'));three.setAttribute('aria-pressed',String(mode==='3d'));for(const [v,b] of Object.entries(viewButtons))b.setAttribute('aria-pressed',String(view===v));select.value=view;routeDraw();bar.dataset.mode=mode;bar.dataset.filter=view;for(const tab of root?.querySelectorAll('.vb-t1__tab')||[]){const active=tab.dataset.tab===(view==='places'?'places':'stamps');tab.setAttribute('aria-selected',String(active));tab.classList.toggle('vb-t1__tab--active',active);}}
  function applyYandex(focus=false){
   const a=adapter();internal=true;try{
    if(a){a.setFilter(view,{focus:!selectedRoute&&focus});if(selectedRoute&&a.openRoute){a.openRoute(selectedRoute,{focus:true}).catch(()=>{note.textContent='Маршрут временно не загрузился.';});}else if(!focus&&selected&&eligible(selected)&&a.hasPlace(selected))a.openPlace(selected);}
    else if(view!=='passport'){const tab=root?.querySelector('[data-tab="'+(view==='places'?'places':'stamps')+'"]');tab?.click();}
    else note.textContent='Для фильтра покупки паспорта на обычной карте установите небольшой адаптер Яндекса из инструкции.';
   }finally{internal=false;}
  }
  function apply3D(){send('setFilters',{view,ski:view==='places',nordic:view==='places',hiking:view==='places'});if(selectedRoute){pendingFocus=false;send('openRoute',{routeId:selectedRoute});return;}if(pendingFocus&&!selected){send('focusView',{view});pendingFocus=false;return;}pendingFocus=false;if(selected&&eligible(selected))send('openPlace',{placeId:adapter()?.canonicalId?.(selected)||'yandex:'+selected});}
  function lifecycle(){send(mode==='3d'&&!document.hidden?'resume':'suspend');if(mode==='3d'&&!document.hidden)send('resize');}
  function setView(next){if(!Object.hasOwn(views,next))return;view=next;selected=null;selectedRoute=null;pendingFocus=true;draw();if(mode==='3d'){if(ready&&!layoutPending)apply3D();}else{applyYandex(true);}}
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
   if(m.event==='routeSelected'&&typeof m.payload?.routeId==='string'){selectedRoute=m.payload.routeId;draw();}
   if(m.event==='error'&&m.payload?.code==='WEBGL_UNAVAILABLE'){clearTimeout(slowTimer);show('yandex');ordinary.focus();note.textContent='3D недоступна в этом браузере. Открыта обычная карта.';}
  });
  for(const tab of root?.querySelectorAll('.vb-t1__tab')||[])tab.addEventListener('click',e=>{if(internal)return;if(mode==='3d'){e.preventDefault();e.stopImmediatePropagation();}view=tab.dataset.tab==='places'?'places':'stamps';draw();if(mode==='3d')setView(view);},true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#map-stamps')setView('stamps');if(location.hash==='#map')setView('places');});
  bus.addEventListener('vb-yandex-change',e=>{if(internal||mode!=='yandex')return;const state=e.detail;if(Object.hasOwn(views,state?.view))view=state.view;selected=typeof state?.sourceId==='string'?state.sourceId:null;selectedRoute=typeof state?.routeId==='string'?state.routeId:null;draw();});
  bus.addEventListener('vb-yandex-routes-error',()=>{note.textContent='Маршруты временно не загрузились. Можно открыть 3D-карту.';});
  bus.addEventListener('vb-yandex-ready',()=>{if(mode==='yandex')applyYandex(!selected);});
  document.addEventListener('visibilitychange',lifecycle);if(window.ResizeObserver)new ResizeObserver(()=>{if(mode==='3d')send('resize');}).observe(host);
  note.textContent='';show(mode);if(sourceRecord&&!sourceRecord.contains(host))sourceRecord.style.display='none';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
