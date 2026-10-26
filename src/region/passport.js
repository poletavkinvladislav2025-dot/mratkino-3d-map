import source from './passport-source.json' with {type:'json'};

export const SOURCE_RECORDS=source.records;
export const INVENTORY_NOTICE=source.inventoryNotice;
export const sourceCoordinates=r=>[Number(r.longitude),Number(r.latitude)];

/** Preserve canonical 3D IDs and put ambiguous legacy IDs in an explicit namespace. */
export function mergeSourcePlaces(existing){
 const places=new Map(existing.map(p=>[p.id,{...p}]));
 for(const r of SOURCE_RECORDS){
  const old=places.get(r.canonicalId),coordinates=r.ownerCoordinates||sourceCoordinates(r);
  const kind=r.recordType==='stamp-point'?'stamp-point':old?.kind||(['masim'].includes(r.sourceId)?'peak':'heritage');
  const changed=old&&old.coordinates.some((v,i)=>v!==coordinates[i]);
  const displayName=r.sourceId==='kraka'?'Хребет Крака':r.displayName||r.name;
  places.set(r.canonicalId,{...old,id:r.canonicalId,name:displayName,displayName,kind,
   coordinates,zoneRadiusKm:old?.zoneRadiusKm||0,major:old?.major||false,
   coordinateStatus:r.coordinateCorrection?'owner-corrected-building':r.sourceId==='kraka'?'project-reference':'owner-source-map',
   sourceRecord:r,sourceCoordinates:sourceCoordinates(r),previousCoordinates:changed?old.coordinates:undefined,
   previousCoordinateStatus:old?.coordinateStatus,previousCoordinateNote:old?.note,
   note:r.coordinateCorrection?.reason|| (r.sourceId==='kraka'?'Основная точка — уточнение владельца; исходная точка сохранена в sourceCoordinates.':'Точка перенесена из исходной карты владельца; это не новая геодезическая проверка.'),
   description:r.description||old?.description||(kind==='peak'?'Горная вершина Южного Урала.':kind==='ridge'?'Хребет Южного Урала.':'Природная локация Южного Урала.'),
   photos:r.photos||old?.photos||[],historical:!!r.historical,
   ...(kind==='stamp-point'?{address:r.address,sellsPassport:r.sellsPassport,conditions:r.conditions,stamps:r.stamps}:{}),
  });
 }
 return [...places.values()];
}

export const SOURCE_TO_PLACE=Object.fromEntries(SOURCE_RECORDS.map(r=>[r.sourceId,r.canonicalId]));
export function aliasesFor(places){
 const ids=new Set(places.map(p=>p.id)),aliases={};
 for(const r of SOURCE_RECORDS){
  aliases['yandex:'+r.sourceId]=r.canonicalId;
  if(!ids.has(r.sourceId))aliases[r.sourceId]=r.canonicalId;
 }
 return aliases;
}
export const stampPoints=places=>places.filter(p=>p.kind==='stamp-point');
export function stampsForPlace(id,places){
 return stampPoints(places).flatMap(point=>point.stamps.filter(s=>s.placeId===id).map(stamp=>({point,stamp})));
}
export function placeVisible(p,filters){
 if(p.kind==='stamp-point')return filters.passport?p.sellsPassport:filters.stamps;
 const category=p.category||(p.kind==='resort'?'ski':['peak','rocks'].includes(p.kind)?'hiking':'interesting');
 return filters.interesting!==false&&filters[category]!==false;
}
export function sourceGeoJSON(places){
 return {type:'FeatureCollection',features:SOURCE_RECORDS.map(r=>{
  const p=places.find(p=>p.id===r.canonicalId);
  return {type:'Feature',id:r.sourceId,geometry:{type:'Point',coordinates:p.coordinates},properties:{sourceId:r.sourceId,canonicalId:p.id,name:p.name,recordType:r.recordType,sourceLatitude:r.latitude,sourceLongitude:r.longitude,sourceCoordinates:sourceCoordinates(r),coordinateStatus:p.coordinateStatus,sellsPassport:p.sellsPassport??null,historical:p.historical}};
 })};
}
