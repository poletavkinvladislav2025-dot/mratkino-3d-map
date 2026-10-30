export function fakeYandex(){
 const calls=[];window.yandexCalls=calls;
 class Map{constructor(container){this.container={fitToViewport(){}};this.geoObjects={add(p){(p.isLine?window.yandexLines:window.yandexMarkers).push(p);},remove(p){const a=p.isLine?window.yandexLines:window.yandexMarkers;const i=a.indexOf(p);if(i>=0)a.splice(i,1);}};this.events={add:()=>{}};this.converter={coordinatesToGlobalPixels:p=>p,globalPixelsToCoordinates:p=>p};this.zoom=11;window.yandexMap=this;}
 setBounds(bounds,options){calls.push({action:'bounds',bounds,options});this.bounds=bounds;this.zoom=bounds[1][0]-bounds[0][0]<.1?14:10;return Promise.resolve();}
 setCenter(center,zoom){calls.push({action:'center',center,zoom});this.zoom=zoom;this.center=center;return Promise.resolve();}
 getBounds(){return this.bounds||[[53.75,58.25],[54.07,58.72]];}getCenter(){return this.center||[54,58.35];}getZoom(){return this.zoom;}setZoom(z){this.zoom=z;}getGlobalPixelCenter(){return [0,0];}}
 class Placemark{constructor(coords){this.coords=coords;this.values={};this.options={set:(k,v)=>this.values[k]=v};this.geometry={getCoordinates:()=>coords};this.events={add:(name,fn)=>this.click=fn};}}
 class Polyline extends Placemark{constructor(c,p,o){super(c);this.isLine=true;this.properties=p;Object.assign(this.values,o);this.geometry.setCoordinates=c=>this.coords=c;}}
 window.yandexMarkers=[];window.yandexLines=[];window.ymaps={ready:fn=>fn(),Map,Placemark,Polyline,projection:{wgs84Mercator:{toGlobalPixels:(p,z)=>[p[1]*2**z,p[0]*-(2**z)],fromGlobalPixels:(p,z)=>[p[1]/-(2**z),p[0]/2**z]}}};
}
