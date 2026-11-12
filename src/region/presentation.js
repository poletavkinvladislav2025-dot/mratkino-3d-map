/** Editorial visibility is independent of insertion order, route geometry and place coordinates. */
const priorities={narrowGauge2:100,waterTower:99,malinovaya:98,mratkino:95,abzakovo:90,bannoye:88,moose:85,'malinovaya-2':75,'malinovaya-3':74};
const names={waterTower:'Водонапорная башня',narrowGauge2:'Паровоз ГР-231'};
export function placePresentation(place){const priority=priorities[place.id]|| (place.major?65:place.kind==='stamp-point'?45:30);return {labelPriority:priority,labelName:names[place.id]||place.name,labelMinZoom:priority>=98?8.3:priority>=85?9.3:place.kind==='stamp-point'?12.4:priority>=70?12:11.3};}
export function labelRank(place,selected){return place.id===selected?1000:placePresentation(place).labelPriority;}
