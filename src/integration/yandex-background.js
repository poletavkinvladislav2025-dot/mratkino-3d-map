/** Observe supported tile readiness / explicit failures without treating opaque HTTP 200 tiles as errors. */
export function watchYandexBackground(map,element,onState,{timeoutMs=18000}={}){
 let disposed=false,epoch=0,timer,bindings=[];const report=state=>{if(!disposed)onState(state);};
 const clear=()=>{clearTimeout(timer);for(const [events,name,fn] of bindings)events.remove?.(name,fn);bindings=[];};
 function bind(events,name,fn){if(events?.add){events.add(name,fn);bindings.push([events,name,fn]);}}
 function containers(layer,depth=0,failed,ready){if(!layer||depth>6)return [];bind(layer.events,'error',failed);bind(layer.events,'tileloaderror',failed);bind(layer.events,'tilesloaded',ready);if(typeof layer.getContainer==='function'){try{return [layer.getContainer()];}catch{return [];}}const found=[];if(typeof layer.getLength==='function')for(let i=0;i<layer.getLength();i++)found.push(...containers(layer.get(i),depth+1,failed,ready));return found;}
 function arm(){
  const turn=++epoch;clear();report('loading');const ready=()=>{if(turn===epoch){clearTimeout(timer);report('ready');}},failed=()=>{if(turn===epoch){clearTimeout(timer);report('error');}};
  const candidates=containers(map.layers,0,failed,ready);if(!candidates.length)report('unverified');
  for(const candidate of candidates){Promise.resolve(candidate).then(container=>{
   if(disposed||turn!==epoch||!container)return;bind(container.events,'error',failed);bind(container.events,'tileloaderror',failed);bind(container.events,'tilesloaded',ready);
   // Container.ready is supported by some SDK renderers, but not all.
   if(typeof container.ready==='function'){const result=container.ready();if(result?.then){timer=setTimeout(failed,timeoutMs);Promise.resolve(result).then(ready,failed);}}
  }).catch(failed);}
  // An unknown renderer gets no speculative timeout: failure UI still works via explicit errors or manual retry.

 }
 const failedImage=e=>{const img=e.target;if(img?.tagName!=='IMG')return;try{if(/(^|\.)(maps\.yandex\.net|maps\.yandex\.ru)$/.test(new URL(img.currentSrc||img.src).hostname))report('error');}catch{}};
 let performanceWatch=null;if(typeof PerformanceObserver==='function'){try{performanceWatch=new PerformanceObserver(list=>{for(const e of list.getEntries()){try{if(e.responseStatus>=400&&/(^|\.)maps\.yandex\.(net|ru)$/.test(new URL(e.name).hostname))report('error');}catch{}}});performanceWatch.observe({type:'resource',buffered:false});}catch{performanceWatch=null;}}
 element.addEventListener('error',failedImage,true);const changed=()=>arm();map.events?.add?.('typechange',changed);arm();
 return {restart:arm,dispose(){disposed=true;++epoch;clear();performanceWatch?.disconnect();element.removeEventListener('error',failedImage,true);map.events?.remove?.('typechange',changed);}};
}
