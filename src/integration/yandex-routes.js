/* Shared route geometry, rendered through the ordinary Yandex SDK. */
function createYandexRoutes(ymaps,map,config,onSelect,onError){
 const base=config.integrationBase||new URL('.',document.currentScript?.src||location.href).href,cache=new Map(),pool=new Map();let routes=[],selected=null,view='places',serial=0,choice=0,timer;
 const boundsOf=coords=>coords.reduce((b,p)=>[[Math.min(b[0][0],p[0]),Math.min(b[0][1],p[1])],[Math.max(b[1][0],p[0]),Math.max(b[1][1],p[1])]],[[180,90],[-180,-90]]);
 const intersects=(a,b)=>a[0][0]<=b[1][0]&&a[1][0]>=b[0][0]&&a[0][1]<=b[1][1]&&a[1][1]>=b[0][1];
 function load(asset){if(!cache.has(asset))cache.set(asset,fetch(new URL('../'+asset,base)).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>data.features.flatMap((f,index)=>!['LineString','MultiLineString'].includes(f.geometry.type)?[]:(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates).map((coords,line)=>({coords,bounds:boundsOf(coords),properties:f.properties,key:index+'/'+line})))).catch(e=>{cache.delete(asset);throw e;}));return cache.get(asset);}
 const ready=fetch(new URL('route-catalog.json',base)).then(r=>{if(!r.ok)throw Error('Route catalog unavailable');return r.json();}).then(d=>{routes=d.routes;return routes;});
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>refresh().catch(onError),120);}
 async function refresh(){const turn=++serial;await ready;const zoom=map.getZoom(),b=map.getBounds(),box=[[b[0][1]-.025,b[0][0]-.025],[b[1][1]+.025,b[1][0]+.025]],wanted=new Set();
  if(view==='places')await Promise.all(routes.filter(r=>r.id===selected||zoom>=r.minZoom&&intersects(r.bounds,box)).map(async r=>{
   const asset=r.displayAsset&&(r.placeId!=='all'||zoom>=7)?r.displayAsset:r.asset,data=await load(asset);if(turn!==serial)return;
   for(const f of data){if(r.featureId&&f.properties.id!==r.featureId||r.featureIds&&!r.featureIds.includes(f.properties.id)||!intersects(f.bounds,box))continue;
    const key=r.id+'/'+asset+'/'+f.key;wanted.add(key);let item=pool.get(key);
    if(!item){const line=new ymaps.Polyline(f.coords.map(p=>[p[1],p[0]]),{hintContent:r.title.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},{strokeColor:r.color,strokeWidth:2.8,strokeOpacity:.95,strokeStyle:r.closed?'shortdash':'solid',zIndex:150});line.events.add('click',()=>onSelect(r.id));map.geoObjects.add(line);item={line,zoom:null};pool.set(key,item);}
    if(item.zoom!==zoom){let coords=f.coords.map(p=>[p[1],p[0]]),offset=f.properties.renderOffset||0;const projection=ymaps.projection?.wgs84Mercator;if(offset&&projection)coords=offsetRoutePixels(coords.map(p=>projection.toGlobalPixels(p,zoom)),offset).map(p=>projection.fromGlobalPixels(p,zoom));item.line.geometry.setCoordinates(coords);item.zoom=zoom;}
    item.line.options.set('strokeWidth',r.id===selected?(r.placeId==='all'?2.6:3.5):(r.placeId==='all'?1.7:2.8));item.line.options.set('zIndex',r.id===selected?220:150);
   }
  }));
  if(turn!==serial)return;for(const [key,item] of pool)if(!wanted.has(key)){map.geoObjects.remove(item.line);pool.delete(key);}
 }
 map.events.add('boundschange',schedule);ready.then(schedule).catch(onError);
 return {ready,get selected(){return selected;},getRoutes:()=>ready,setView(next){choice++;view=next;if(next!=='places')selected=null;return refresh().catch(onError);},clear(){choice++;selected=null;schedule();},async select(id,focus=true){const token=++choice;await ready;if(token!==choice)return false;const r=routes.find(r=>r.id===id);if(!r)return false;selected=id;view='places';if(focus)try{await map.setBounds([[r.bounds[0][1],r.bounds[0][0]],[r.bounds[1][1],r.bounds[1][0]]],{checkZoomRange:true,zoomMargin:innerWidth<=640?[35,30,170,30]:[40,350,40,40],duration:300});}catch(error){if(token!==choice)return false;throw error;}if(token!==choice)return false;await refresh();return token===choice;},refresh};
}
