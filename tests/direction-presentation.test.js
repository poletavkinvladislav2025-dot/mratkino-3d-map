import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTION_ROUTES,directionRoute} from '../src/region/directions.js';

test('ascent cards show the stored outward line without changing source round-trip distances',()=>{
  for(const route of DIRECTION_ROUTES.filter(r=>r.tripType==='out_and_back'&&r.id!=='malinovaya-three-return')){
    assert.equal(route.displayDistanceM,route.lineDistanceM);
    assert.equal(route.returnLabel,'Возвращение тем же путём.');
    if(route.hasGeometry)assert.ok(Math.abs(route.distanceM-route.lineDistanceM*2)<=1);
  }
  assert.equal(directionRoute('kirel-kuzgun').displayDistanceM,3213);
});

test('through and full return itineraries keep their full distance; incomplete lines keep their qualification',()=>{
  for(const id of ['malinovaya-three-through','malinovaya-three-return']){
    const route=directionRoute(id);
    assert.equal(route.displayDistanceM,route.distanceM);
    assert.equal(route.returnLabel,null);
  }
  assert.equal(directionRoute('bolshoy-shatak-avzyan').displayDistanceLabel,'До конца GPX, в одну сторону');
  assert.equal(directionRoute('aigir-ufa').displayDistanceLabel,'Доступная часть, в одну сторону');
  assert.equal(directionRoute('small-yamantau-ecotrail').displayDistanceM,null);
});
