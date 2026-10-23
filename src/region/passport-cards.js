import {PLACES,byId} from './presets.js';
import {stampsForPlace,INVENTORY_NOTICE} from './passport.js';

function heading(parent,text){const h=document.createElement('h3');h.textContent=text;parent.append(h);}
export function renderPassportContent(card,p,region){
 if(!p)return;
 const h=region.host;
 h.text(card,`${p.coordinates[1]}, ${p.coordinates[0]}`,'place-coordinates');
 if(p.historical)h.text(card,'Историческая точка. Объект утрачен; современная модель не создаётся.','historical-note');
 for(const photo of p.photos||[]){
  const image=document.createElement('img');image.className='place-photo';image.alt=photo.alt||p.name;image.loading='eager';image.decoding='async';image.width=480;image.height=300;image.hidden=true;image.addEventListener('load',()=>{image.hidden=false;},{once:true});image.addEventListener('error',()=>image.remove(),{once:true});image.src=photo.url;card.append(image);
 }
 const list=document.createElement('ul');list.className='passport-links';
 if(p.kind==='stamp-point'){
  h.text(card,p.address);
  h.text(card,p.sellsPassport?'Где купить паспорт: можно купить в этом киоске.':'Паспорт здесь не продаётся.');
  h.text(card,p.conditions);
  heading(card,'Где поставить штамп');h.text(card,INVENTORY_NOTICE,'inventory-note');
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
