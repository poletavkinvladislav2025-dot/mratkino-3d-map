import {PLACES,byId} from './presets.js';
import {stampsForPlace,INVENTORY_NOTICE} from './passport.js';

function heading(parent,text){const h=document.createElement('h3');h.textContent=text;parent.append(h);}
export function renderPassportContent(card,p,region){
 if(!p)return;
 const h=region.host;
 const list=document.createElement('ul');list.className='passport-links';
 if(p.kind==='stamp-point'){
  h.text(card,p.address);
  h.text(card,p.sellsPassport?'Паспорт туриста продаётся':'Паспорт здесь не продаётся.','passport-availability');
  h.text(card,p.sellsPassport?p.conditions:p.conditions.replace(' Паспорта здесь не продаются.',''));
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Штампы в этой точке · '+p.stamps.length;details.open=true;details.append(summary);card.append(details);card=details;h.text(card,INVENTORY_NOTICE,'inventory-note');
  for(const stamp of p.stamps){
   const item=document.createElement('li'),name=document.createElement('span');name.textContent=stamp.name;item.append(name);
   if(stamp.placeId){const place=byId(stamp.placeId);item.append(region.button('Открыть место: '+place.name,'Открыть место: '+place.name,()=>region.choose(place.id)));}
   list.append(item);
  }
 }else{
  const links=stampsForPlace(p.id,PLACES);if(!links.length)return;
  heading(card,'Связанные штампы');h.text(card,INVENTORY_NOTICE,'inventory-note');
  for(const {point,stamp} of links){const item=document.createElement('li'),name=document.createElement('span');name.textContent=stamp.name;item.append(name,region.button('Поставить штамп: '+point.name,'Поставить штамп: '+point.name,()=>region.choose(point.id)));list.append(item);}
 }
 card.append(list);
}
