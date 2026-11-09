import {BUZHD_BOUNDS,buzhdPopupContent,validateBuzhd} from './buzhd.js';
const layerIds=['buzhd-solid','buzhd-peat','buzhd-peat-structure','buzhd-label'];
export class BuzhdController{
 constructor(region){this.region=region;this.host=region.host;this.visible=true;this.trains=true;this.token=0;}
 setup(parent){
  const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='История края';field.append(legend);
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=this.visible;input.dataset.buzhd='layer';label.append(input,document.createTextNode(' Белорецкая узкоколейка (БУЖД)'));input.addEventListener('change',()=>{this.visible=input.checked;this.sync();});this.input=input;field.append(label);
  field.append(this.region.button('Целиком','Показать всю Белорецкую узкоколейку',()=>this.region.choose('buzhd')));
  const trainLabel=document.createElement('label'),train=document.createElement('input');train.type='checkbox';train.checked=this.trains;train.dataset.buzhd='trains';trainLabel.append(train,document.createTextNode(' Историческая анимация поездов'));train.addEventListener('change',()=>{this.trains=train.checked;this.sync();});field.append(trainLabel);parent.append(field);
 }
 async ensure(){this.promise??=this.host.json('region/buzhd/buzhd.geojson').then(data=>{validateBuzhd(data);this.data=data;return data;}).catch(e=>{this.promise=null;throw e;});return this.promise;}
 fit(animate=true){this.visible=true;this.sync();const h=this.host,padding=this.region.cameraPadding();this.region.showCard(false);h.mode2D=false;h.map.stop();h.map.fitBounds(BUZHD_BOUNDS,{padding:{top:Math.max(75,padding.top),right:45,bottom:65,left:45},maxZoom:12,pitch:35,bearing:0,duration:animate?h.duration():0});this.region.cameraButton();}
 sync(){
  const map=this.host.map;if(!map?.getLayer('buzhd-solid'))return;this.input.checked=this.visible;
  for(const id of layerIds){const value=this.visible?'visible':'none';if(map.getLayoutProperty(id,'visibility')!==value)map.setLayoutProperty(id,'visibility',value);}
  if(!this.visible)this.popup?.remove();
  if(this.bound!==map){this.bound=map;for(const id of layerIds.slice(0,3)){map.on('click',id,e=>{if(!this.visible||!e.features?.length)return;this.popup?.remove();this.popup=new this.host.ml.Popup({maxWidth:'300px',className:'route-name-popup',closeOnMove:true}).setLngLat(e.lngLat).setDOMContent(buzhdPopupContent(e.features[0].properties)).addTo(map);});}}
  if(this.visible&&map.getBounds().getWest()<BUZHD_BOUNDS[1][0]&&map.getBounds().getEast()>BUZHD_BOUNDS[0][0]&&map.getBounds().getSouth()<BUZHD_BOUNDS[1][1]&&map.getBounds().getNorth()>BUZHD_BOUNDS[0][1]&&map.getZoom()>=14&&this.region.sceneVisible&&!this.scene&&!this.loading){
   this.loading=true;const token=this.token;Promise.all([import('./buzhd-trains.js'),this.ensure()]).then(([{BuzhdTrainScene},data])=>{if(token!==this.token||this.host.map!==map)return;this.scene=new BuzhdTrainScene(this.region,data);map.addLayer(this.scene);}).catch(e=>{if(token===this.token)this.region.dataError(e,'Историческая сцена БУЖД временно недоступна.');}).finally(()=>{if(token===this.token)this.loading=false;});
  }
  map.triggerRepaint();
 }
 reset(){this.token++;this.loading=false;this.popup?.remove();this.popup=null;if(this.scene){if(this.host.map?.getLayer(this.scene.id))this.host.map.removeLayer(this.scene.id);else this.scene.onRemove();this.scene=null;}this.bound=null;}
}
