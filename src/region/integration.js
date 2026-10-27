import {PLACES,CITY,PLACE_ALIASES,canonicalPlaceId} from './presets.js';
import {validateFilters,filterSnapshot} from './filters.js';
const places=new Set(['all',CITY.id,...PLACES.map(p=>p.id),...Object.keys(PLACE_ALIASES)]);
export const ROUTE_IDS=[...['1','2','3','4','5','7','8','9','10','11','12','13'].map(n=>'abzakovo/trail/'+n),...[1,2,3,4].map(n=>'mratkino/trail/south-'+n),...[1,2,3].map(n=>'mratkino/trail/north-'+n),'malinovaya/first-return','malinovaya/third','malinovaya/three-peaks','yalangas/a1','yalangas/a2'];
const routes=new Set(ROUTE_IDS),record=x=>!!x&&typeof x==='object'&&!Array.isArray(x),finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const knownRoute=id=>routes.has(id)||typeof id==='string'&&/^[a-z-]+\/way\/\d{1,14}$/.test(id)&&PLACES.some(p=>p.id===id.split('/')[0]&&p.geometryUrl);
export function cameraPayload(p){
 if(!record(p)||!Object.keys(p).length||Object.keys(p).some(k=>!['center','zoom','pitch','bearing'].includes(k)))return null;
 const out={};
 if(p.center!==undefined){if(!record(p.center)||Object.keys(p.center).length!==2||!finite(p.center.lat,-85,85)||!finite(p.center.lng,-180,180))return null;out.center=[p.center.lng,p.center.lat];}
 for(const [key,min,max] of [['zoom',3,20.2],['pitch',0,85],['bearing',-180,180]])if(p[key]!==undefined){if(!finite(p[key],min,max))return null;out[key]=p[key];}
 return out;
}
export function validateCommand(d){
 if(!record(d)||d.type!=='vb3d.command'||d.version!==1||typeof d.id!=='string'||!/^[A-Za-z0-9_.:-]{1,80}$/.test(d.id)||Object.keys(d).some(k=>!['type','version','id','command','payload'].includes(k)))return null;
 const p=d.payload??{};if(!record(p))return null;
 if(d.command==='openPlace'&&Object.keys(p).length===1&&places.has(p.placeId))return {...d,payload:p};
 if(d.command==='openRoute'&&Object.keys(p).length===1&&knownRoute(p.routeId))return {...d,payload:p};
 if(d.command==='setCamera'&&cameraPayload(p))return {...d,payload:p};
 if(d.command==='setFilters'&&validateFilters(p))return {...d,payload:p};
 if(d.command==='focusView'&&Object.keys(p).length===1&&['places','stamps','passport'].includes(p.view))return {...d,payload:p};
 if(['resize','suspend','resume'].includes(d.command)&&Object.keys(p).length===0)return {...d,payload:p};
 return null;
}
export function readURLState(search=''){
 const p=new URLSearchParams(search),place=p.get('place'),out={place:places.has(place)?canonicalPlaceId(place):'all',card:p.get('card')!=='0'};
 if(knownRoute(p.get('route')))out.route=p.get('route');
 if(['0','1'].includes(p.get('effects')))out.effects=p.get('effects')==='1';
 const numeric=key=>p.get(key)?.trim()?Number(p.get(key)):NaN;
 const camera={};if(p.has('lat')&&p.has('lng'))camera.center={lat:numeric('lat'),lng:numeric('lng')};
 for(const [key,param] of [['zoom','z'],['pitch','pitch'],['bearing','bearing']])if(p.has(param))camera[key]=numeric(param);
 out.camera=cameraPayload(camera)||undefined;return out;
}
export function permittedOrigin(value,ownOrigin){
 if(!value)return ownOrigin;
 try{const u=new URL(value);return u.origin===value&&['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.origin:null;}catch{return null;}
}

/** Versioned, parent-only, origin-bound command queue. No messages move a camera implicitly. */
export class IntegrationBridge{
 constructor(region){
  this.region=region;this.host=region.host;this.origin=permittedOrigin(new URLSearchParams(location.search).get('parentOrigin'),location.origin);this.queue=[];this.pending=new Set();this.results=new Map();this.ready=false;this.disposed=false;this.lastCamera=0;
  this.receive=e=>{
   if(window.parent===window||e.source!==window.parent||!this.origin||e.origin!==this.origin)return;
   const command=validateCommand(e.data);
   if(!command){if(e.data?.type==='vb3d.command')this.event('error',{code:'INVALID_COMMAND',message:'Неподдерживаемая команда или неверные параметры.',recoverable:true},typeof e.data?.id==='string'?e.data.id.slice(0,80):undefined);return;}
   if(this.results.has(command.id)){this.event('commandResult',this.results.get(command.id),command.id);return;}
   if(this.pending.has(command.id))return;
   if(this.queue.length>=32){this.event('error',{code:'QUEUE_FULL',message:'Слишком много ожидающих команд.',recoverable:true},command.id);return;}
   this.pending.add(command.id);
   if(['suspend','resume'].includes(command.command)){this.execute(command);return;}
   this.queue.push(command);this.drain();
  };
  window.addEventListener('message',this.receive);
 }
 bindMap(){
  const map=this.host.map;if(this.bound===map)return;this.bound=map;
  map.on('movestart',e=>{if(e.originalEvent)this.suppressCamera=false;});
  map.on('move',()=>this.cameraChanged());map.on('moveend',()=>this.updateURL());
 }
 snapshot(){const m=this.host.map;if(!m)return null;const c=m.getCenter();return {center:{lat:c.lat,lng:c.lng},zoom:m.getZoom(),pitch:m.getPitch(),bearing:m.getBearing()};}
 event(event,payload={},requestId){
  if(this.disposed)return;const d={type:'vb3d.event',version:1,event,payload,...(requestId?{requestId}:{})};
  if(window.parent!==window&&this.origin)window.parent.postMessage(d,this.origin);
  this.host.dispatchEvent(new CustomEvent('vb3d-event',{detail:d,bubbles:true}));
 }
 tryReady(){
  if(this.ready||!this.region.bootstrapped||this.host.getAttribute('data-map-state')!=='ready')return;
 this.ready=true;this.bindMap();this.lastSnapshot=this.snapshot();this.event('ready',{placeId:this.region.id,routeId:this.region.routeId,camera:this.snapshot(),filters:filterSnapshot(this.region.filters),commands:['openPlace','openRoute','setCamera','setFilters','focusView','resize','suspend','resume']});this.drain();
 }
 async drain(){if(!this.ready||this.processing||this.disposed)return;this.processing=true;try{while(this.queue.length&&!this.disposed)await this.execute(this.queue.shift());}finally{this.processing=false;}}
 async execute(c){
  const r=this.region,h=this.host;clearTimeout(this.cameraTimer);this.cameraTimer=null;this.suppressCamera=true;
  try{
   if(c.command==='openPlace')await r.choose(c.payload.placeId,false,{silent:true});
   if(c.command==='setFilters')r.setFilters(c.payload,{silent:true});
   if(c.command==='focusView')await r.focusView(c.payload.view,{silent:true});
   if(c.command==='openRoute')await r.openRoute(c.payload.routeId,{silent:true,focus:true});
   if(c.command==='setCamera'){h.map.stop();h.map.jumpTo(cameraPayload(c.payload));r.sync();}
   if(c.command==='resize'){h.map.resize();r.sync();}
   if(c.command==='suspend')r.suspend(true);
   if(c.command==='resume')r.suspend(false);
   if(this.disposed)return;const result={command:c.command,ok:true,placeId:r.id,routeId:r.routeId,camera:this.snapshot(),filters:filterSnapshot(r.filters)};this.results.set(c.id,result);if(this.results.size>128)this.results.delete(this.results.keys().next().value);this.event('commandResult',result,c.id);this.updateURL();
  }catch(e){if(!this.disposed)this.event('error',{code:e.message==='UNKNOWN_ROUTE'?'UNKNOWN_ROUTE':'COMMAND_FAILED',message:'Команда не выполнена.',recoverable:true},c.id);}
  finally{this.pending.delete(c.id);this.lastSnapshot=this.snapshot();this.suppressCamera=false;}
 }
 cameraChanged(){
  if(!this.ready||this.suppressCamera||this.disposed)return;const current=this.snapshot(),last=this.lastSnapshot;if(last&&current&&Math.abs(current.center.lat-last.center.lat)<1e-7&&Math.abs(current.center.lng-last.center.lng)<1e-7&&Math.abs(current.zoom-last.zoom)<1e-6&&Math.abs(current.pitch-last.pitch)<1e-5&&Math.abs(current.bearing-last.bearing)<1e-5)return;
  const remaining=250-(performance.now()-this.lastCamera);
  if(remaining>0){if(!this.cameraTimer)this.cameraTimer=setTimeout(()=>{this.cameraTimer=null;this.cameraChanged();},remaining);return;}
  this.lastCamera=performance.now();this.lastSnapshot=current;this.event('cameraChanged',current);
 }
 updateURL(){
  if(this.disposed||!this.region.bootstrapped)return;clearTimeout(this.urlTimer);this.urlTimer=setTimeout(()=>{
   if(this.disposed)return;const u=new URL(location.href),r=this.region,c=this.snapshot();u.searchParams.set('place',r.id);if(r.routeId)u.searchParams.set('route',r.routeId);else u.searchParams.delete('route');
   u.searchParams.set('card',r.cardOpen?'1':'0');u.searchParams.set('effects',r.effectsWanted?'1':'0');
   if(c){u.searchParams.set('lat',c.center.lat.toFixed(6));u.searchParams.set('lng',c.center.lng.toFixed(6));u.searchParams.set('z',c.zoom.toFixed(2));u.searchParams.set('pitch',c.pitch.toFixed(1));u.searchParams.set('bearing',c.bearing.toFixed(1));}
   history.replaceState(null,'',u);
  },400);
 }
 reset(){this.ready=false;this.bound=null;clearTimeout(this.cameraTimer);clearTimeout(this.urlTimer);this.cameraTimer=null;this.suppressCamera=false;}
 dispose(){this.disposed=true;clearTimeout(this.cameraTimer);clearTimeout(this.urlTimer);window.removeEventListener('message',this.receive);this.queue=[];this.pending.clear();this.results.clear();}
}
