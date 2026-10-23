import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PLACES,byId,PLACE_ALIASES,presetFor} from '../src/region/presets.js';
import {SOURCE_RECORDS,SOURCE_TO_PLACE,sourceCoordinates,sourceGeoJSON,stampsForPlace,stampPoints,placeVisible} from '../src/region/passport.js';
import {readURLState,validateCommand} from '../src/region/integration.js';

test('all 37 owner source records resolve uniquely without deleting any earlier place',()=>{
 const csv=fs.readFileSync('data/passport/source-coordinates.csv','utf8').trim().split('\n').slice(1).map(l=>l.split(','));
 assert.equal(csv.length,37);assert.equal(SOURCE_RECORDS.length,37);assert.equal(new Set(SOURCE_RECORDS.map(r=>r.canonicalId)).size,37);
 for(const [id,lat,lng] of csv){
  const r=SOURCE_RECORDS.find(r=>r.sourceId===id),p=byId(r.canonicalId);
  assert.equal(r.latitude,lat);assert.equal(r.longitude,lng);assert.deepEqual(sourceCoordinates(r),[Number(lng),Number(lat)]);
  assert.deepEqual(p.coordinates,id==='kraka'?[58.039331,53.605817]:[Number(lng),Number(lat)]);
  assert.equal(byId('yandex:'+id),p);assert.equal(presetFor('yandex:'+id).id,p.id);
 }
 for(const file of ['places.json','winter-places.json'])for(const old of JSON.parse(fs.readFileSync('src/region/'+file)))assert.ok(byId(old.id),old.id);
 assert.equal(PLACES.length,50);assert.equal(stampPoints(PLACES).length,6);assert.equal(new Set(PLACES.map(p=>p.id)).size,50);
 assert.deepEqual(byId('kraka').sourceCoordinates,[58.033943,53.584992]);assert.deepEqual(byId('ethnopark').coordinates,[58.289544,53.945615]);
});
test('Malinovaya legacy collision and both railways and factory/whistle remain separate',()=>{
 assert.equal(SOURCE_TO_PLACE.malinovaya,'malinovaya-3');assert.equal(SOURCE_TO_PLACE.malinovaya1,'malinovaya');
 assert.equal(byId('malinovaya').name,'Первая Малиновая');assert.equal(byId('yandex:malinovaya').name,'Третья Малиновая');assert.equal(byId('malinovaya1').id,'malinovaya');
 for(const [a,b] of [['malinovaya','malinovaya-3'],['narrowGauge1','narrowGauge2'],['beloretskFactory','factoryWhistle'],['stampStation','kiosk3']]){assert.notEqual(byId(a),byId(b));assert.notDeepEqual(byId(a).coordinates,byId(b).coordinates);}
 assert.equal(byId('lostSymbol').historical,true);assert.match(byId('factoryWhistle').description,/крыше котельной №1/);
 for(const id of Object.keys(PLACE_ALIASES)){
  assert.equal(readURLState('?place='+encodeURIComponent(id)).place,byId(id).id);
  assert.ok(validateCommand({type:'vb3d.command',version:1,id:'alias',command:'openPlace',payload:{placeId:id}}));
 }
 assert.equal(readURLState('?place=malinovaya&route=malinovaya/third').route,'malinovaya/third');
});
test('64 stamp assignments retain their exact point and explicit links in both directions',()=>{
 const points=stampPoints(PLACES),expected={stampStation:1,kiosk3:21,kiosk2:7,kiosk4:11,kiosk7:10,kiosk8:14};
 let assignments=0,linked=0;
 for(const point of points){assert.equal(point.stamps.length,expected[point.id]);assert.equal(point.sellsPassport,point.id!=='stampStation');for(const stamp of point.stamps){assignments++;assert.ok(stamp.name);if(stamp.placeId){linked++;assert.equal(SOURCE_TO_PLACE[stamp.sourcePlaceId],stamp.placeId);assert.ok(byId(stamp.placeId));assert.ok(stampsForPlace(stamp.placeId,PLACES).some(s=>s.point===point&&s.stamp===stamp));}else assert.equal(stamp.sourcePlaceId,undefined);}}
 assert.equal(assignments,64);assert.equal(linked,36);assert.equal(stampsForPlace('factoryWhistle',PLACES).length,2);
 assert.equal(stampsForPlace('malinovaya',PLACES).length,1);assert.equal(stampsForPlace('malinovaya-3',PLACES).length,2);
 assert.match(byId('stampStation').conditions,/Бесплатный штамп «Белорецк — Счастье в горах»/);
 for(const p of points.filter(p=>p.sellsPassport))assert.match(p.conditions,/при покупке сувенира/);
 const filters={interesting:false,stamps:true,passport:true};assert.deepEqual(points.filter(p=>placeVisible(p,filters)).map(p=>p.id).sort(),['kiosk2','kiosk3','kiosk4','kiosk7','kiosk8']);
});
test('GeoJSON coordinates and source precision survive export; no imported mountain creates a track',()=>{
 const geo=sourceGeoJSON(PLACES);assert.equal(geo.features.length,37);assert.ok(geo.features.every(f=>f.geometry.type==='Point'));
 for(const f of geo.features){assert.deepEqual(f.geometry.coordinates,byId(f.properties.canonicalId).coordinates);assert.equal(f.properties.sourceLatitude,SOURCE_RECORDS.find(r=>r.sourceId===f.id).latitude);assert.equal(f.geometry.coordinates.length,2);}
 assert.equal(SOURCE_RECORDS.find(r=>r.sourceId==='bigIremel').latitude,'54.520000');
});
