/** One imagery configuration and raster controller for the ordinary and 3D maps.
 * Only the owner's public, domain-restricted MapTiler key belongs in imagery.json.
 * No demo credentials or unlicensed third-party tiles are used. */
export const IMAGERY_SOURCE='vb-satellite';
export const IMAGERY_LAYER='vb-satellite';
const imageryConfigs=new Map();
export function imageryConfig(value){return value?.schemaVersion===1&&value.provider==='maptiler'&&value.enabled===true&&typeof value.publicKey==='string'&&/^[A-Za-z0-9_-]{6,256}$/.test(value.publicKey)?{provider:'maptiler',publicKey:value.publicKey}:null;}
export function readImageryConfig(url){if(!url)return Promise.resolve(null);const key=String(url);if(!imageryConfigs.has(key))imageryConfigs.set(key,fetch(key).then(r=>r.ok?r.json():null).then(imageryConfig).catch(()=>null));return imageryConfigs.get(key);}
export function imagerySource(config){return {type:'raster',url:'https://api.maptiler.com/tiles/satellite-v2/tiles.json?key='+encodeURIComponent(config.publicKey),tileSize:256};}
export function validBasemap(value){return value==='scheme'||value==='satellite';}
export const IMAGERY_CSS=`.vb-basemap-group{display:flex;align-items:center;flex:none;gap:3px;padding:3px;border:1px solid #d2dfd4;border-radius:12px;background:#f0f4ef}.vb-basemap-group[hidden]{display:none!important}.vb-basemap-group button{min-height:44px;padding:7px 12px;border:0;border-radius:9px;background:transparent;color:#244b3c;font:600 13px/1.2 Arial,sans-serif;cursor:pointer}.vb-basemap-group button[aria-pressed=true]{background:#244b3c;color:#fff}.vb-basemap-group button:focus-visible{outline:3px solid #bd854b;outline-offset:2px}.vb-imagery-note{font:12px/1.4 Arial,sans-serif;color:#526c5b}.vb-imagery-brand{background:#fffffff0;border-radius:4px;padding:3px 6px;line-height:1}.vb-imagery-brand a{display:block}.vb-imagery-brand img{display:block;width:86px;height:24px;object-fit:contain}@media(max-width:760px){.vb-basemap-group button{min-height:44px;padding:7px 10px}}`;
export function imagerySwitch(doc,onSelect){const group=doc.createElement('div');group.className='vb-basemap-group';group.setAttribute('role','group');group.setAttribute('aria-label','Подложка карты');const buttons=[];for(const [id,label] of [['scheme','Схема'],['satellite','Спутник']]){const b=doc.createElement('button');b.type='button';b.textContent=label;b.dataset.basemap=id;b.setAttribute('aria-pressed',String(id==='scheme'));b.addEventListener('click',()=>onSelect(id));group.append(b);buttons.push(b);}return {element:group,update(mode){for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.basemap===mode));}};}
const REGION_GROUND=new Set(['region-surfaces','region-landuse','region-forest','region-water','region-rivers','region-shore','region-road-casing','region-roads','forest','forest-soft','hillshade','malinovaya-rock-surface','nature-open','nature-rock-edge','facility-buildings']);
export function imageryGroundLayers(layers,variant){return layers.filter(l=>variant==='ordinary'?l.id!==IMAGERY_LAYER&&!l.id.startsWith('vb-ylines')&&!['symbol','background','custom'].includes(l.type):REGION_GROUND.has(l.id));}
export class MapImagery{
 constructor(map,{configURL,config,variant='region',logoURL,onChange=()=>{},onStatus=()=>{}}={}){
  this.map=map;this.variant=variant;this.logoURL=logoURL;this.onChange=onChange;this.onStatus=onStatus;this.mode='scheme';this.hidden=new Map();this.loaded=false;this.disposed=false;
  this.style=()=>{this.hidden.clear();this.loaded=false;this.sync();};this.data=e=>{if(e.sourceId===IMAGERY_SOURCE&&e.sourceDataType==='content'&&this.mode==='satellite'){this.loaded=true;this.sync();this.onStatus('ready');}};
  this.error=e=>{if(e.sourceId===IMAGERY_SOURCE&&this.mode==='satellite'){this.mode='scheme';this.sync();this.onChange('scheme');this.onStatus('error');}};
  this.idle=()=>this.sync();map.on('idle',this.idle);map.on('style.load',this.style);map.on('sourcedata',this.data);map.on('error',this.error);
  this.ready=(config!==undefined?Promise.resolve(imageryConfig(config)):readImageryConfig(configURL)).then(c=>{if(this.disposed)return false;this.config=c;return !!c;});
 }
 async set(mode){if(!validBasemap(mode))throw Error('INVALID_BASEMAP');await this.ready;if(this.disposed)return;if(mode==='satellite'&&!this.config)throw Error('IMAGERY_NOT_CONFIGURED');if(this.mode===mode){this.sync();return;}this.mode=mode;this.sync();this.onChange(mode);this.onStatus(mode==='satellite'&&!this.loaded?'loading':'ready');}
 sync(){const m=this.map;if(this.disposed||!m.getStyle()?.layers)return;
  if(this.mode==='satellite'&&this.config&&!m.getSource(IMAGERY_SOURCE)){m.addSource(IMAGERY_SOURCE,imagerySource(this.config));const layers=m.getStyle().layers||[],before=this.variant==='ordinary'?layers.find(l=>l.type==='symbol')?.id:layers.find(l=>l.id==='trail-area')?.id;m.addLayer({id:IMAGERY_LAYER,type:'raster',source:IMAGERY_SOURCE,layout:{visibility:'visible'},paint:{'raster-fade-duration':200}},before);}
  const visibility=this.mode==='satellite'?'visible':'none';if(m.getLayer(IMAGERY_LAYER)&&m.getLayoutProperty(IMAGERY_LAYER,'visibility')!==visibility)m.setLayoutProperty(IMAGERY_LAYER,'visibility',visibility);
  const active=this.mode==='satellite'&&this.loaded;
  if(active){for(const l of imageryGroundLayers(m.getStyle().layers||[],this.variant)){if(!this.hidden.has(l.id))this.hidden.set(l.id,m.getLayoutProperty(l.id,'visibility')||'visible');if(m.getLayoutProperty(l.id,'visibility')!=='none')m.setLayoutProperty(l.id,'visibility','none');}}
  else{for(const [id,visibility] of this.hidden)if(m.getLayer(id))m.setLayoutProperty(id,'visibility',visibility);this.hidden.clear();}
  this.brand(active);
 }
 brand(show){const m=this.map;if(show&&!this.brandControl&&m.addControl&&this.logoURL){const doc=m.getContainer().ownerDocument,el=doc.createElement('div'),a=doc.createElement('a'),img=doc.createElement('img');el.className='maplibregl-ctrl vb-imagery-brand';a.href='https://www.maptiler.com/';a.target='_blank';a.rel='noopener noreferrer';img.src=this.logoURL;img.alt='MapTiler';a.append(img);el.append(a);this.brandControl={onAdd:()=>el,onRemove:()=>el.remove()};m.addControl(this.brandControl,'bottom-left');}if(this.brandControl?.onAdd)this.brandControl.onAdd().hidden=!show;}
 dispose(){this.disposed=true;this.map.off('idle',this.idle);this.map.off('style.load',this.style);this.map.off('sourcedata',this.data);this.map.off('error',this.error);if(this.brandControl&&this.map.hasControl?.(this.brandControl))this.map.removeControl(this.brandControl);}
}
