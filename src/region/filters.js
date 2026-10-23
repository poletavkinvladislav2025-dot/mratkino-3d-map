export const FILTER_KEYS=['ski','nordic','hiking','interesting','stamps','passport'];
export const FILTER_VIEWS=['all','places','stamps','passport'];
export function validateFilters(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||!Object.keys(p).length)return false;
 return Object.entries(p).every(([k,v])=>k==='view'?FILTER_VIEWS.includes(v):FILTER_KEYS.includes(k)&&typeof v==='boolean')&&!(p.view&&['interesting','stamps','passport'].some(k=>k in p));
}
export function filterView(f){return f.interesting?(f.stamps?'all':'places'):f.passport?'passport':f.stamps?'stamps':'all';}
export function applyFilters(current,patch){
 if(!validateFilters(patch))throw Error('INVALID_FILTERS');
 const next={...current,...Object.fromEntries(Object.entries(patch).filter(([k])=>k!=='view'))};
 if(patch.view)Object.assign(next,{interesting:['all','places'].includes(patch.view),stamps:patch.view!=='places',passport:patch.view==='passport'});
 if(patch.passport===true)next.stamps=true;
 if(patch.stamps===false)next.passport=false;
 return next;
}
export const filterSnapshot=f=>({...Object.fromEntries(FILTER_KEYS.map(k=>[k,!!f[k]])),view:filterView(f)});
