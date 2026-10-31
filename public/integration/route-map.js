/* Mount the existing dual-engine map with one stable route ID. No copied geometry. */
(function(){
 'use strict';const base=new URL('.',document.currentScript.src);
 async function mountRouteMap(container,{routeId,placeId,mode='embedded',autoFit=true,engine='yandex'}={}){
  const host=typeof container==='string'?document.querySelector(container):container;
  if(!host)throw Error('Не найден контейнер карты');if(!routeId&&!placeId)throw Error('Укажите routeId или placeId');
  if(document.querySelector('.vb-map-complete'))throw Error('На странице уже подключена общая карта');
  const script=document.createElement('script');script.src=new URL('tilda-map-block.js?v=20261101-routes',base).href;script.dataset.defaultMode=engine==='3d'?'3d':'yandex';script.dataset.autoFit=String(autoFit);if(routeId)script.dataset.routeId=routeId;if(placeId)script.dataset.placeId=placeId;
  await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('Не удалось загрузить карту'));host.append(script);});
  const holder=host.querySelector('.vb-map-complete');if(!holder)throw Error('Карта не создала контейнер');
  const scope=holder.shadowRoot;await new Promise((resolve,reject)=>{const started=Date.now();function check(){const bar=scope.querySelector('#vb-map-modes'),state=scope.VisitBeloretskYandex?.getState();if(state&&bar?.dataset.routeCatalog==='ready'&&(!routeId||bar.dataset.routeId===routeId))resolve();else if(Date.now()-started>45000)reject(Error('Карта загружается дольше обычного'));else setTimeout(check,100);}check();});
  return {element:holder,setRoute(id){scope.dispatchEvent(new CustomEvent('vb-open-route',{detail:id}));},getState(){const bar=scope.querySelector('#vb-map-modes');return {...scope.VisitBeloretskYandex?.getState(),routeId:bar?.dataset.routeId||null,mode:bar?.dataset.mode,view:bar?.dataset.filter};},mode};
 }
 window.VisitBeloretskMaps={...(window.VisitBeloretskMaps||{}),mountRouteMap};window.mountRouteMap=mountRouteMap;
})();
