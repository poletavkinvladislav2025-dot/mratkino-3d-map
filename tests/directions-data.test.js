import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {DIRECTION_ROUTES,directionRoute,directionPlace,directionPadding} from '../src/region/directions.js';
import {readURLState,validateCommand} from '../src/region/integration.js';
const source=JSON.parse(fs.readFileSync('data/directions/input/routes.json')),geo=JSON.parse(fs.readFileSync('public/region/directions/routes.geojson')),audit=JSON.parse(fs.readFileSync('data/directions/build-audit.json'));
test('every supplied route has one stable ID, explicit completeness and source provenance; old links resolve without duplicate lines',()=>{
 assert.deepEqual(DIRECTION_ROUTES.map(r=>r.id),source.routes.map(r=>r.id));assert.equal(new Set(DIRECTION_ROUTES.map(r=>r.id)).size,46);
 for(const r of DIRECTION_ROUTES){assert.equal(r.publicReady,r.buildStatus==='ready');assert.equal(r.hasGeometry,geo.features.some(f=>f.properties.id===r.id));assert.ok(r.revision);assert.ok(r.checkedAt);assert.equal(r.originalStartPointId,source.routes.find(x=>x.id===r.id).startPointId);if(r.hasGeometry){assert.ok(r.geometrySource);assert.ok(r.distanceM>0);const a=audit.routes.find(a=>a.routeId===r.id);if(r.geometrySource==='calculated_osm_walking'){assert.match(a.provenance.url,/profile=trekking/);assert.ok(!a.provenance.wayTags.some(t=>/railway=(rail|narrow_gauge|light_rail)/.test(t)));}}else{assert.equal(r.distanceM,null);assert.ok(r.statusReason);}
  for(const p of r.points){assert.notEqual(p.precision,'not_trailhead');const original=source.points.find(x=>x.id===p.id);if(original)assert.deepEqual(p.coordinates,[original.lon,original.lat]);}
 }
 for(const [a,id] of [['yalangas/a1','yalangas-a1'],['malinovaya/three-peaks','malinovaya-three-through']])assert.equal(directionRoute(a).id,id);
});
test('route and place URL APIs select the correct route, and strict bridge supports the stable IDs',()=>{
 assert.equal(readURLState('?routeId=rassypnaya-shushpa').route,'rassypnaya-shushpa');assert.equal(readURLState('?routeId=rassypnaya-shushpa').place,'rassypnaya');assert.equal(readURLState('?placeId=iremel').route,'iremel-upper');assert.equal(directionPlace('aygir').placeId,'aigir');
 for(const r of DIRECTION_ROUTES)assert.ok(validateCommand({type:'vb3d.command',version:1,id:'test',command:'openRoute',payload:{routeId:r.id}}));assert.equal(readURLState('?routeId=not-real').route,undefined);
});
test('Iremel variants differ, Kraka is a short radial route, Kirеl doubles its one-way GPX, Malinovaya has the accepted peak order',()=>{
 const line=id=>geo.features.find(f=>f.properties.id===id).geometry.coordinates;assert.notDeepEqual(line('iremel-upper'),line('iremel-lower'));assert.ok(directionRoute('kraka-shigaevo').lineDistanceM<6000);assert.ok(directionRoute('kraka-shigaevo').distanceM<12000);
 assert.ok(Math.abs(directionRoute('kirel-kuzgun').distanceM-directionRoute('kirel-kuzgun').lineDistanceM*2)<=1);
 assert.deepEqual(directionRoute('malinovaya-three-through').points.map(p=>p.id),['mal-start-city','mal-1','mal-2','mal-3','mal-start-otn']);
 const r=directionRoute('malinovaya-three-return');assert.equal(r.finishPointId,'mal-start-city');assert.equal(r.tripType,'out_and_back');assert.deepEqual(r.points.find(p=>p.id==='mal-2').coordinates,[58.306934,54.007729]);
 assert.equal(directionRoute('bolshoy-shatak-avzyan').days,2);assert.equal(directionRoute('bolshoy-shatak-avzyan').stampAvailable,false);assert.equal(directionRoute('bolshoy-shatak-avzyan').publicReady,false);assert.ok(directionRoute('bolshoy-shatak-avzyan').points.some(p=>p.id==='shatak-yandex'));
 assert.equal(directionRoute('small-yamantau-ecotrail').hasGeometry,false);assert.equal(directionRoute('arvyak-ryaz-main').publicReady,false);
 const p=directionPadding(390,650,350,290);assert.ok(p.bottom<=650*.48);assert.equal(p.left,44);
});
