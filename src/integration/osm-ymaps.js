/* OpenStreetMap engine for the ordinary map.
 * The card, filter and search code was written for the Yandex Maps 2.1 API. Instead of rewriting it,
 * this file provides the small part of that API the code uses (Map, Placemark, Polyline, projection),
 * drawn with MapLibre on OpenFreeMap vector tiles (OpenStreetMap data) with Mapterhorn relief.
 * Coordinates follow the Yandex order [lat, lon]; Yandex zoom z equals MapLibre zoom z-1. */
const OSM_STYLE='https://tiles.openfreemap.org/styles/liberty';
const OSM_DEM={type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],tileSize:512,encoding:'terrarium',maxzoom:12,attribution:'<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn</a>'};

function createOsmYmaps(ml,css){
 const PI=Math.PI,toML=c=>[c[1],c[0]],clampZ=z=>Math.max(2,Math.min(19,z));
 const toGP=(c,z)=>{const s=256*2**z,sin=Math.max(-.9999,Math.min(.9999,Math.sin(c[0]*PI/180)));return [(c[1]+180)/360*s,(.5-Math.log((1+sin)/(1-sin))/(4*PI))*s];};
 const fromGP=(p,z)=>{const s=256*2**z,n=PI-2*PI*p[1]/s;return [180/PI*Math.atan(Math.sinh(n)),p[0]/s*360-180];};
 class Events{constructor(){this.h={};}add(t,fn){for(const k of [].concat(t))(this.h[k]||=[]).push(fn);return this;}remove(t,fn){for(const k of [].concat(t))this.h[k]=(this.h[k]||[]).filter(f=>f!==fn);return this;}fire(t,e={}){for(const f of (this.h[t]||[]).slice())f(e);}}
 class Options{constructor(o,changed){this.o={...o};this.changed=changed;}set(k,v){if(k&&typeof k==='object')Object.assign(this.o,k);else this.o[k]=v;this.changed?.();return this;}get(k,d){return k in this.o?this.o[k]:d;}}
 const margin=m=>{const a=m==null?[0]:[].concat(m);const [t,r,b,l]=a.length===1?[a[0],a[0],a[0],a[0]]:a.length===2?[a[0],a[1],a[0],a[1]]:[a[0],a[1],a[2],a[3]];return {top:t,right:r,bottom:b,left:l};};

 class Placemark{
  constructor(coords,properties={},options={}){this.coords=coords.slice();this.properties={get:k=>properties[k],set:(k,v)=>{properties[k]=v;this.render();}};this.events=new Events();this.options=new Options(options,()=>this.render());
   this.geometry={getCoordinates:()=>this.coords.slice(),setCoordinates:c=>{this.coords=c.slice();this.marker?.setLngLat(toML(this.coords));}};this.props=properties;}
  attach(owner){if(this.marker)return;this.owner=owner;const el=document.createElement('div');el.className='vb-osm-pm';el.addEventListener('click',e=>{e.stopPropagation();this.events.fire('click',{});});this.el=el;this.render();this.marker=new ml.Marker({element:el,anchor:'top-left'}).setLngLat(toML(this.coords)).addTo(owner.ml);this.render();}
  detach(){this.marker?.remove();this.marker=null;}
  render(){const el=this.el;if(!el)return;const o=this.options;el.style.zIndex=String(o.get('zIndex',100));el.title=this.props.hintContent||'';
   if(o.get('iconLayout')==='default#image'){const [w,h]=o.get('iconImageSize',[20,24]),[x,y]=o.get('iconImageOffset',[-w/2,-h]);Object.assign(el.style,{width:w+'px',height:h+'px',background:`url("${o.get('iconImageHref','')}") center/contain no-repeat`,cursor:'pointer'});el.textContent='';this.marker?.setOffset([x,y]);}
   else{el.innerHTML='';const dot=document.createElement('span');dot.className='vb-osm-dot';el.append(dot);if(this.props.iconCaption){const t=document.createElement('span');t.className='vb-osm-caption';t.textContent=this.props.iconCaption;el.append(t);}this.marker?.setOffset([-6,-6]);}}
 }

 let lineSeq=0;
 class Polyline{
  constructor(coords,properties={},options={}){this.id=++lineSeq;this.coords=coords;this.props=properties;this.events=new Events();this.options=new Options(options,()=>this.owner?.syncLines());this.geometry={getCoordinates:()=>this.coords,setCoordinates:c=>{this.coords=c;this.owner?.syncLines();}};}
  attach(owner){this.owner=owner;owner.lines.set(this.id,this);owner.syncLines();}
  detach(){const o=this.owner;if(!o)return;o.lines.delete(this.id);this.owner=null;o.syncLines();}
  feature(){const o=this.options;return {type:'Feature',properties:{pid:this.id,color:o.get('strokeColor','#c0582f'),width:o.get('strokeWidth',3),opacity:o.get('strokeOpacity',.95),dash:o.get('strokeStyle','solid')!=='solid',z:o.get('zIndex',150)},geometry:{type:'LineString',coordinates:this.coords.map(toML)}};}
 }

 class MapAdapter{
  constructor(container,state={}){
   const root=container.getRootNode();
   if(css&&root instanceof ShadowRoot&&!root.querySelector('style[data-vb-maplibre]')){const s=document.createElement('style');s.dataset.vbMaplibre='';s.textContent=css+'\n.vb-osm-pm{position:absolute}.vb-osm-dot{display:block;width:12px;height:12px;border-radius:50%;background:#1f5f3c;border:2px solid #fff;box-shadow:0 0 0 1px #0004}.vb-osm-caption{position:absolute;left:16px;top:-3px;white-space:nowrap;font:600 12px/1.3 Arial,sans-serif;color:#193c30;background:#fffffff2;padding:2px 6px;border-radius:6px;box-shadow:0 1px 4px #0003}';root.append(s);}
   this.events=new Events();this.lines=new Map();this.type='yandex#map';this.failed=false;
   this.ml=new ml.Map({container,style:OSM_STYLE,center:toML(state.center||[54,58.35]),zoom:clampZ(state.zoom||11)-1,maxZoom:18,attributionControl:{compact:true},dragRotate:false,pitchWithRotate:false,touchPitch:false,fadeDuration:0});
   this.ml.touchZoomRotate.disableRotation();this.ml.keyboard.disableRotation?.();
   this.ml.on('style.load',()=>this.overlay());
   // Keep the source credits folded into the (i) button on load; it opens on tap.
   this.ml.once('load',()=>container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));this.ml.on('moveend',()=>this.events.fire('boundschange',{}));
   this.ml.on('click','vb-ylines-hit',e=>{const id=e.features?.[0]?.properties.pid;this.lines.get(id)?.events.fire('click',{});});
   this.ml.on('mouseenter','vb-ylines-hit',()=>{this.ml.getCanvas().style.cursor='pointer';});this.ml.on('mouseleave','vb-ylines-hit',()=>{this.ml.getCanvas().style.cursor='';});
   this.geoObjects={add:o=>{o.attach(this);return this.geoObjects;},remove:o=>{o.detach();return this.geoObjects;}};
   this.container={fitToViewport:()=>this.ml.resize(),getElement:()=>container};
   this.converter={coordinatesToGlobalPixels:(c,z)=>toGP(c,z),globalPixelsToCoordinates:(p,z)=>fromGP(p,z)};
  }
  overlay(){const m=this.ml,layers=m.getStyle().layers||[];
   // Russian names only (the base style shows Latin and local names together).
   for(const l of layers)if(l.type==='symbol'&&l.layout?.['text-field']&&!String(l.id).includes('shield'))try{m.setLayoutProperty(l.id,'text-field',['coalesce',['get','name:ru'],['get','name']]);}catch{}
   if(!m.getSource('vb-dem')){m.addSource('vb-dem',OSM_DEM);const first=layers.find(l=>l.type==='symbol')?.id;m.addLayer({id:'vb-hillshade',type:'hillshade',source:'vb-dem',paint:{'hillshade-exaggeration':.32,'hillshade-shadow-color':'#5e6f66','hillshade-accent-color':'#8a988f'}},first);}
   if(!m.getSource('vb-ylines')){m.addSource('vb-ylines',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    const paint={'line-color':['get','color'],'line-width':['get','width'],'line-opacity':['get','opacity']},layout={'line-cap':'round','line-join':'round','line-sort-key':['get','z']};
    m.addLayer({id:'vb-ylines-casing',type:'line',source:'vb-ylines',layout,paint:{'line-color':'#ffffff','line-width':['+',['get','width'],2],'line-opacity':['*',['get','opacity'],.8]}});
    m.addLayer({id:'vb-ylines',type:'line',source:'vb-ylines',filter:['!',['get','dash']],layout,paint});
    m.addLayer({id:'vb-ylines-dash',type:'line',source:'vb-ylines',filter:['get','dash'],layout:{...layout,'line-cap':'butt'},paint:{...paint,'line-dasharray':[2,1.6]}});
    m.addLayer({id:'vb-ylines-hit',type:'line',source:'vb-ylines',paint:{'line-color':'#000','line-width':14,'line-opacity':0}});}
   this.syncLines(true);}
  syncLines(now){if(this.pending&&!now)return;this.pending=true;const run=()=>{this.pending=false;const src=this.ml.getSource('vb-ylines');if(!src)return;src.setData({type:'FeatureCollection',features:[...this.lines.values()].map(l=>l.feature()).sort((a,b)=>a.properties.z-b.properties.z)});};now?run():requestAnimationFrame(run);}
  camera(move,duration){return new Promise(resolve=>{let done=false;const finish=()=>{if(!done){done=true;resolve();}};this.ml.once('moveend',finish);move();setTimeout(finish,(duration||0)+300);});}
  setCenter(center,zoom,opts={}){const d=opts.duration??0;return this.camera(()=>this.ml.easeTo({center:toML(center),...(zoom!=null?{zoom:clampZ(zoom)-1}:{}),duration:d}),d);}
  setZoom(zoom,opts={}){const d=opts.duration??0;return this.camera(()=>this.ml.easeTo({zoom:clampZ(zoom)-1,duration:d}),d);}
  setBounds(b,opts={}){const sw=b[0],ne=b[1];if(Math.abs(sw[0]-ne[0])<1e-7&&Math.abs(sw[1]-ne[1])<1e-7)return this.setCenter(sw,opts.maxZoom??15,opts);
   const c=this.ml.getContainer(),w=c.clientWidth||300,h=c.clientHeight||300,p=margin(opts.zoomMargin),sx=Math.min(1,(w-40)/Math.max(1,p.left+p.right)),sy=Math.min(1,(h-40)/Math.max(1,p.top+p.bottom));
   const padding={top:p.top*sy,bottom:p.bottom*sy,left:p.left*sx,right:p.right*sx},d=opts.duration??0;
   return this.camera(()=>this.ml.fitBounds([toML(sw),toML(ne)],{padding,maxZoom:clampZ(opts.maxZoom??18)-1,duration:d}),d);}
  getZoom(){return this.ml.getZoom()+1;}
  getCenter(){const c=this.ml.getCenter();return [c.lat,c.lng];}
  getBounds(){const b=this.ml.getBounds();return [[b.getSouth(),b.getWest()],[b.getNorth(),b.getEast()]];}
  getGlobalPixelCenter(){return toGP(this.getCenter(),this.getZoom());}
  getType(){return this.type;}
  setType(type){if(type==null)return Promise.resolve();this.type=type;if(this.failed){this.failed=false;this.ml.setStyle(OSM_STYLE);}return Promise.resolve();}
 }
 const wgs84Mercator={toGlobalPixels:toGP,fromGlobalPixels:fromGP};
 return {Map:MapAdapter,Placemark,Polyline,projection:{wgs84Mercator},ready:fn=>{fn?.();return Promise.resolve();}};
}

/** Loads the map library once per page from the map's own server (no external CDN). */
function loadOsmMapSDK(config={}){
 const w=window,slot='__vbOsmSdkV1';if(w[slot])return w[slot];
 const base=config.integrationBase||new URL('.',document.currentScript?.src||location.href).href;
 w[slot]=import(new URL('osm-maplibre.js',base).href).then(async mod=>{
  const lib=mod?.ml?mod:w.__vbMapLibre;if(!lib?.ml)throw Error('MAP_LIBRARY');
  // A worker must come from the page's own origin: load its code and start it from a blob URL.
  if(!w.__vbOsmWorker){const r=await fetch(lib.workerURL);if(!r.ok)throw Error('MAP_WORKER');w.__vbOsmWorker=URL.createObjectURL(new Blob([await r.text()],{type:'text/javascript'}));lib.ml.setWorkerUrl(w.__vbOsmWorker);}
  return {sdk:createOsmYmaps(lib.ml,lib.css),diagnostics:{keyStatus:'not-needed',reused:false,duplicateBootstraps:0}};
 }).catch(error=>{w[slot]=null;throw error;});
 return w[slot];
}

/** Background readiness for the OSM basemap: ready on the first idle frame, error if it never loads. */
function watchOsmBackground(map,container,onState){
 const m=map.ml;let disposed=false,timer=null,last=null;
 const report=state=>{if(disposed||state===last)return;last=state;onState(state);};
 const idle=()=>report('ready');
 const error=()=>{if(!m.isStyleLoaded())map.failed=true;};
 const arm=()=>{clearTimeout(timer);report('loading');if(m.isStyleLoaded()&&m.areTilesLoaded())report('ready');timer=setTimeout(()=>{if(last!=='ready'){map.failed=!m.isStyleLoaded();report(m.isStyleLoaded()?'ready':'error');}},20000);};
 m.on('idle',idle);m.on('error',error);arm();
 return {restart:arm,dispose(){disposed=true;clearTimeout(timer);m.off('idle',idle);m.off('error',error);}};
}

// The ordinary-map runtime calls these names; they now start the OpenStreetMap engine.
function loadYandexSDK(config){return loadOsmMapSDK(config);}
function watchYandexBackground(map,container,onState){return watchOsmBackground(map,container,onState);}
