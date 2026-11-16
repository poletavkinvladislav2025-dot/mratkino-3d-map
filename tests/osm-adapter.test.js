import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function fixture(){
 const element=()=>({style:{},handlers:{},attributes:{},children:[],addEventListener(k,fn){this.handlers[k]=fn;},setAttribute(k,v){this.attributes[k]=v;},append(v){this.children.push(v);}});
 const source={updates:0,setData(data){this.updates++;this.data=data;}};
 class Map{constructor(){this.touchZoomRotate={disableRotation(){}};this.keyboard={};}on(){}once(){}getSource(){return source;}}
 class Marker{constructor({element}){this.element=element;}setLngLat(){return this;}setOffset(){return this;}addTo(){return this;}remove(){}}
 const context=vm.createContext({document:{createElement:element},ShadowRoot:class{},requestAnimationFrame:fn=>fn(),setTimeout,clearTimeout});vm.runInContext(fs.readFileSync('src/integration/osm-ymaps.js','utf8'),context);
 const sdk=context.createOsmYmaps({Map,Marker},''),map=new sdk.Map({getRootNode:()=>({})},{});return {sdk,map,source};
}
test('ordinary markers honour visibility, accessible names and keyboard activation through filter changes',()=>{
 const {sdk,map}=fixture(),marker=new sdk.Placemark([54,58],{hintContent:'Водонапорная башня'},{iconLayout:'default#image',visible:false});map.geoObjects.add(marker);const el=marker.el;assert.equal(el.style.display,'none');assert.equal(el.tabIndex,-1);assert.equal(el.attributes['aria-hidden'],'true');assert.equal(el.attributes['aria-label'],'Водонапорная башня');
 marker.options.set('visible',true);assert.equal(el.style.display,'');assert.equal(el.tabIndex,0);let clicks=0,prevented=0;marker.events.add('click',()=>clicks++);for(const key of ['Enter',' ','ArrowDown'])el.handlers.keydown({key,preventDefault(){prevented++;},stopPropagation(){}});assert.equal(clicks,2);assert.equal(prevented,2);
 marker.options.set('visible',false);el.handlers.keydown({key:'Enter',preventDefault(){},stopPropagation(){}});assert.equal(clicks,2);assert.equal(el.tabIndex,-1);
});
test('hidden lines leave both drawing and hit testing; unchanged style options do not resend GeoJSON',()=>{
 const {sdk,map,source}=fixture(),line=new sdk.Polyline([[54,58],[54.1,58.1]],{},{visible:false,strokeWidth:3});map.geoObjects.add(line);assert.equal(source.data.features.length,0);line.options.set('visible',true);assert.equal(source.data.features.length,1);const before=source.updates;line.options.set('strokeWidth',3);assert.equal(source.updates,before);line.options.set('strokeWidth',4);assert.equal(source.updates,before+1);line.options.set('visible',false);assert.equal(source.data.features.length,0);
});
