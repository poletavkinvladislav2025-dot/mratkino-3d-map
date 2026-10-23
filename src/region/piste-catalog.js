import catalog from './piste-catalog.json' with {type:'json'};
export {catalog};
export const CATEGORIES={novice:{color:'#178154',label:'Лёгкая'},easy:{color:'#176ac0',label:'Средняя'},intermediate:{color:'#d0343d',label:'Сложная'},advanced:{color:'#26333c',label:'Очень сложная'},expert:{color:'#26333c',label:'Высшая категория'},unknown:{color:'#758079',label:'Не подтверждена'}};
export function classification(resort,p){
 const official=catalog[resort]?.categories?.[resort==='abzakovo'?p.number:p.name];
 const category=official||p.difficulty_osm||p.difficultyOsm||p.tags?.['piste:difficulty']||'unknown';
 const known=CATEGORIES[category]||CATEGORIES.unknown;
 return {...known,category,verified:!!official,source:official?'official-scheme':'osm-unverified',label:known.label+(official?'':category==='unknown'?'':' · OSM')};
}
export const decoratePistes=(resort,data)=>({...data,features:data.features.map(f=>{const c=classification(resort,f.properties);return {...f,properties:{...f.properties,category:c.category,categorySource:c.source,categoryVerified:c.verified,displayColor:c.color}};})});
export const pisteId=(resort,p)=>resort==='abzakovo'?`abzakovo/trail/${p.number}`:`mratkino/trail/${p.name?.startsWith('Ю')?'south':'north'}-${p.name?.slice(1)}`;
