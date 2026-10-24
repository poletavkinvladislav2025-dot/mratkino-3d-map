import content from './map-content.json' with {type:'json'};
export {content};
export const placeKind=kind=>({peak:'Гора',ridge:'Хребет',rocks:'Скалы',waterfall:'Водопад',natural:'Природное место',resort:'Горнолыжный комплекс','training-park':'Парк активного отдыха',nordic:'Лыжные трассы',ethnopark:'Этнопарк',heritage:'История и достопримечательности','stamp-point':'Точка штампов',city:'Город'}[kind]||'Место');
export const routeKind=category=>({ski:'Горнолыжная трасса',nordic:'Беговая лыжня',lift:'Подъёмник',tubing:'Тюбинговая трасса',training:'Спортивный участок'}[category]||'Трасса');
export function routeName(p){
 const raw=p.name||'',generic=!raw||/^(Маршрут OSM|Участок OSM|Лыжный \/ лыжероллерный участок OSM|Подъёмник)$/i.test(raw);
 const number=String(p.number||'').replace(/^№\s*/,'');
 if(generic)return routeKind(p.category)+(number?' №'+number:'');
 if(number&&raw.replace(/^№\s*/,'')===number)return routeKind(p.category)+' №'+number;
 return raw;
}
export function routeDescription(place,p){
 if(p.category==='nordic'){
  if(place==='ufa-biathlon')return 'Лыжный участок биатлонного комплекса в Уфе. Асфальтированные участки используются также для лыжероллерной подготовки.';
  if(place==='abzakovo-biathlon')return 'Асфальтированная лыжно-роллерная трасса рядом с горнолыжным курортом Абзаково.';
  if(place==='rodeo')return 'Лыжный участок в окрестностях Родео-парка в Учалах.'+(p.tags?.surface==='asphalt'?' Проходит по асфальтированной дорожке.':'');
  return 'Участок для беговых лыж в окрестностях горнолыжного центра.'+(p.tags?.['piste:grooming']==='classic'?' Для классического хода.':'');
 }
 if(p.category==='lift')return ({gondola:'Гондольная канатная дорога для подъёма к началу спусков.',chair_lift:'Кресельный подъёмник для подъёма к началу спусков.',drag_lift:'Бугельный подъёмник для подъёма по склону.',platter:'Тарельчатый бугельный подъёмник.',magic_carpet:'Ленточный подъёмник учебной зоны.'}[p.tags?.aerialway]||'Подъёмник для подъёма к зоне катания.');
 if(p.category==='tubing')return 'Участок для спуска на тюбингах.';
 if(p.category==='training')return 'Спортивный участок для тренировок на территории горнолыжного центра.';
 return 'Горнолыжный спуск на склоне курорта.';
}
