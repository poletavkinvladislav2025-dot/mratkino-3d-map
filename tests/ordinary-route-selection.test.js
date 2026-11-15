import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('ordinary route selection releases the UI while background geometry is still loading',async()=>{
 let backgroundRequested=false;
 const context=vm.createContext({URL,Map,Set,setTimeout,clearTimeout,innerWidth:1365,document:{currentScript:null},location:{href:'https://example.org/integration/'},fetch:async url=>String(url).endsWith('route-catalog.json')?{ok:true,json:async()=>({routes:[{id:'test-route',title:'Маршрут',placeId:'test',hasGeometry:true,minZoom:10,asset:'region/track.geojson',bounds:[[58,54],[58.1,54.1]],points:[]}]})}:(backgroundRequested=true,new Promise(()=>{}))});
 vm.runInContext(fs.readFileSync('src/integration/yandex-routes.js','utf8'),context);
 const map={events:{add(){}},getZoom:()=>13,getBounds:()=>[[53,57],[55,59]],setBounds:async()=>{},geoObjects:{add(){},remove(){}}};
 const api=context.createYandexRoutes({},map,{integrationBase:'https://example.org/integration/'},()=>{},()=>{});
 const selected=await Promise.race([api.select('test-route'),new Promise((_,reject)=>setTimeout(()=>reject(Error('selection waits for background geometry')),1000))]);
 assert.equal(selected,true);assert.equal(api.selected,'test-route');assert.equal(backgroundRequested,true);
});
