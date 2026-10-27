export function fakeYandex(){
 const calls=[];window.yandexCalls=calls;
 class Map{constructor(container){this.container={fitToViewport(){}};this.geoObjects={add(p){window.yandexMarkers.push(p);}};this.converter={coordinatesToGlobalPixels:p=>p,globalPixelsToCoordinates:p=>p};this.zoom=11;window.yandexMap=this;}
 setBounds(bounds,options){calls.push({action:'bounds',bounds,options});this.bounds=bounds;this.zoom=bounds[1][0]-bounds[0][0]<.1?14:10;return Promise.resolve();}
 setCenter(center,zoom){calls.push({action:'center',center,zoom});this.zoom=zoom;return Promise.resolve();}
 getZoom(){return this.zoom;}setZoom(z){this.zoom=z;}getGlobalPixelCenter(){return [0,0];}}
 class Placemark{constructor(coords){this.coords=coords;this.values={};this.options={set:(k,v)=>this.values[k]=v};this.geometry={getCoordinates:()=>coords};this.events={add:(name,fn)=>this.click=fn};}}
 window.yandexMarkers=[];window.ymaps={ready:fn=>fn(),Map,Placemark};
}
