import {boundsFor,EMPTY} from '../map-data.js';
export const KRAKA_A=[58.195555,53.807985];
export const KRAKA_B=[58.141468,53.818296];
/** Owner supplied anchors, without inventing a path to the new summit. */
export class KrakaController{
 constructor(region){this.region=region;this.host=region.host;this.markers=[];this.trackWanted=false;}
 setup(){
  const h=this.host,m=h.map;if(this.bound===m)return;this.reset();this.bound=m;
  m.addSource('kraka-but',{type:'geojson',data:this.data||EMPTY});
  m.addLayer({id:'kraka-but-halo',type:'line',source:'kraka-but',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fffdf4','line-width':7}});
  m.addLayer({id:'kraka-but-line',type:'line',source:'kraka-but',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#dc5536','line-width':4,'line-dasharray':[2,1.5]}});
  for(const [label,name,point] of [['А','Старт',KRAKA_A],['Б','Вершина Краки',KRAKA_B]]){
   const el=this.region.button(label+' · '+name,label+' · '+name,()=>this.region.choose('bolshoy-kraka'));el.className='kraka-anchor';el.dataset.anchor=label;
   const marker=new h.ml.Marker({element:el,anchor:'bottom',occludedOpacity:.8}).setLngLat(point).addTo(m);this.markers.push({el,marker});
  }
  m.on('click','kraka-but-line',()=>this.region.choose('bolshoy-kraka'));
 }
 sync(){
  if(!this.host.map?.getLayer('snow'))return;this.setup();const enabled=this.region.filters.hiking&&this.region.filters.interesting,visible=enabled&&this.host.$('[data-layer=labels]').checked&&this.host.map.getZoom()>=10;
  for(const {el} of this.markers)el.hidden=!visible;
  const show=enabled&&this.trackWanted?'visible':'none';for(const id of ['kraka-but-halo','kraka-but-line'])if(this.host.map.getLayoutProperty(id,'visibility')!==show)this.host.map.setLayoutProperty(id,'visibility',show);
 }
 async toggleTrack(wanted){
  this.trackWanted=wanted;this.sync();if(!wanted)return;
  try{this.promise??=this.host.json('region/kraka/but-track.geojson').catch(e=>{this.promise=null;throw e;});this.data=await this.promise;if(this.host.abort.aborted)return;this.host.map?.getSource('kraka-but')?.setData(this.data);if(this.trackWanted)this.fit(true);}
  catch(e){this.trackWanted=false;this.checkbox&&(this.checkbox.checked=false);this.sync();this.region.dataError(e,'Трек БЮТ временно недоступен.');}
 }
 fit(track=false,animate=true){
  const h=this.host;if(!h.map)return;const points=[KRAKA_A,KRAKA_B],features=points.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:p}}));if(track&&this.data)features.push(...this.data.features);
  const bounds=boundsFor(features),padding=this.region.cameraPadding();const camera=h.map.cameraForBounds(bounds,{padding:{top:Math.max(85,padding.top),bottom:Math.max(65,padding.bottom),left:Math.max(60,padding.left),right:Math.max(60,padding.right)},maxZoom:13.5,bearing:-25});
  h.mode2D=false;h.map.stop();h.map.easeTo({...camera,pitch:55,duration:animate?h.duration():0});
 }
 card(container){
  const h=this.host;for(const [name,p] of [['А · Старт',KRAKA_A],['Б · Вершина Краки',KRAKA_B]]){const row=document.createElement('p');row.textContent=`${name}: ${p[1]}, ${p[0]}`;container.append(row);const a=document.createElement('a');a.href='https://yandex.ru/maps/?pt='+p.join(',')+'&z=15';a.target='_blank';a.rel='noopener noreferrer';a.textContent=name+' ↗';container.append(a);}
  container.append(this.region.button('Показать А и Б','Показать обе точки',()=>this.fit()));
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=this.trackWanted;input.addEventListener('change',()=>this.toggleTrack(input.checked));label.className='kraka-track-toggle';label.append(input,document.createTextNode(' Показать протяжённый трек БЮТ'));container.append(label);this.checkbox=input;
  h.text(container,'Трек БЮТ ведёт к прежней точке Краки, а не к новой Б. Соединяющая линия А—Б не является проверенным маршрутом и не рисуется.','access-note');
 }
 reset(){this.markers.forEach(({marker})=>marker.remove());this.markers=[];this.bound=null;}
}
