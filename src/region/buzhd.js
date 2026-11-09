// Owner-supplied OSM railway geometry. Never infer or join missing railway sections.
import metadata from './buzhd-metadata.json' with {type:'json'};
export const BUZHD_BOUNDS=metadata.bounds;
export const BUZHD_SOURCE='buzhd';
export const BUZHD_HISTORY='https://visitbeloretsk.ru/uzkokoleyka';
export const BUZHD_ATTRIBUTION='<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Трасса: © участники OpenStreetMap · ODbL</a>';
export const BUZHD_LINES={north:{color:'#193C30'},south:{color:'#193C30'},tukan:{color:'#24543F'},peat:{color:'#B08D57'}};
export function railwayIconSVG(kind){
 const body=kind==='steam'?'<path d="M3 15V9h10v6M5 9V5h3v4M13 15V6h7v9M15 8h3M2 16h20M19 15l3 3"/>':kind==='diesel'?'<path d="M3 16V7h14l4 5v4M6 10h3m3 0h3M2 17h20"/>':'<circle cx="12" cy="12" r="4" fill="currentColor"/>';
 return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'+body+(kind==='point'?'':'<circle cx="6" cy="19" r="2"/><circle cx="16" cy="19" r="2"/>')+'</svg>';
}
export const BUZHD_POINTS=[
 {id:'gr231',canonicalId:'narrowGauge2',name:'Паровоз ГР-231',coordinates:[58.33854,53.95218],color:'#B08D57',icon:'steam',description:'Памятник дороге на въезде в Белорецк. Построен в 1953 г. в ГДР, работал на БУЖД, на постаменте с 1982 г., сюда перенесён 16.07.2022.'},
 {id:'tu7',name:'Тепловоз ТУ7А (памятник)',coordinates:[58.39439,53.97998],color:'#B08D57',icon:'diesel',description:'Тепловоз узкоколейки, поставлен рядом с паровозом в 2002 г.'},
 {id:'cut',name:'Скальная выемка БУЖД',coordinates:[58.59418,54.22092],color:'#193C30',icon:'point',description:'Визитная карточка дороги: путь прорезал скалу на выезде из Тирлянского.'},
 {id:'arsha',name:'Бывший мост узкоколейки',coordinates:[58.57117,54.28353],color:'#193C30',icon:'point',description:'Мост бывшей узкоколейки на участке Тирлян — Верхнеаршинский (в 2006 г. ещё стоял).'},
];

/** Validate all coordinates before deriving bounds; keep the supplied collection unchanged. */
export function validateBuzhd(data){
 if(data?.type!=='FeatureCollection'||!data.features?.length)throw Error('BUZHD_DATA_MISSING');
 const bounds=[[Infinity,Infinity],[-Infinity,-Infinity]];
 let lineCount=0;
 for(const f of data.features){
  if(f.geometry?.type==='Point'){const p=f.geometry.coordinates;if(!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite))throw Error('BUZHD_INVALID_COORDINATE');continue;}
  lineCount++;
  if(f.type!=='Feature'||!Object.hasOwn(BUZHD_LINES,f.properties?.line)||!['LineString','MultiLineString'].includes(f.geometry?.type))throw Error('BUZHD_INVALID_FEATURE');
  const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
  if(!Array.isArray(lines)||!lines.length)throw Error('BUZHD_INVALID_LINE');
  for(const line of lines){
   if(!Array.isArray(line)||line.length<2)throw Error('BUZHD_INVALID_LINE');
   for(const p of line){
    if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>85)throw Error('BUZHD_INVALID_COORDINATE');
    for(let i=0;i<2;i++){bounds[0][i]=Math.min(bounds[0][i],p[i]);bounds[1][i]=Math.max(bounds[1][i],p[i]);}
   }
  }
 }
 if(!lineCount)throw Error('BUZHD_DATA_MISSING');
 return bounds;
}

/** MapLibre line layers drape on active terrain; no elevated custom geometry or invented connectors. */
export function addBuzhdLayers(style,data,{visible=true}={}){
 const bounds=typeof data==='string'?BUZHD_BOUNDS:validateBuzhd(data),source=BUZHD_SOURCE;
 style.sources[source]={type:'geojson',data,tolerance:0,attribution:BUZHD_ATTRIBUTION};
 const lines=['==',['geometry-type'],'LineString'];
 const structure=['in',['get','structure'],['literal',['мост','выемка']]],peat=['==',['get','line'],'peat'];
 const layout={'line-cap':'butt','line-join':'round',visibility:visible?'visible':'none'};
 style.layers.push({id:'buzhd-solid',type:'line',source,filter:['all',lines,['!',peat]],layout:{...layout},paint:{'line-color':['match',['get','line'],'tukan','#24543F','#193C30'],'line-width':['case',structure,6,4]}});
 // Dash lengths in MapLibre are multiples of the line width: these remain 6px / 8px.
 for(const thick of [false,true])style.layers.push({id:thick?'buzhd-peat-structure':'buzhd-peat',type:'line',source,filter:['all',lines,peat,thick?structure:['!',structure]],layout:{...layout},paint:{'line-color':'#B08D57','line-width':thick?6:3,'line-dasharray':thick?[1,8/6]:[2,8/3]}});
 style.layers.push({id:'buzhd-label',type:'symbol',source,filter:lines,minzoom:13,layout:{visibility:layout.visibility,'symbol-placement':'line','symbol-spacing':450,'text-field':'Бывшая узкоколейка · 1912–2007','text-font':['Noto Sans Regular'],'text-size':12},paint:{'text-color':'#193C30','text-halo-color':'#fffdf7','text-halo-width':2}});
 return bounds;
}

export function buzhdPopupContent(properties){
 const root=document.createElement('section'),title=document.createElement('h3');
 title.textContent=properties.section||'Белорецкая узкоколейка';root.append(title);
 const paragraph=text=>{const p=document.createElement('p');p.textContent=text;root.append(p);};
 const dates=[];if(properties.opened!=null)dates.push('Открыта: '+properties.opened);if(properties.closed!=null)dates.push('Закрыта: '+properties.closed);if(dates.length)paragraph(dates.join(' · '));
 paragraph('Рельсы сняты к 2007 году. Сейчас по полотну идут грунтовки.');
 if(properties.line==='peat')paragraph('Принадлежность ветки уточняется');
 if(properties.line==='north')paragraph('Часть трассы — на территории Южно-Уральского заповедника, вход ограничен');
 const link=document.createElement('a');link.href=BUZHD_HISTORY;link.target='_blank';link.rel='noopener noreferrer';link.textContent='История дороги →';root.append(link);return root;
}
