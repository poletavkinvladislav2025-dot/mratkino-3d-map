import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {PLACES,byId} from '../src/region/presets.js';
import {ROCK_SURFACES,rockColumns,rockFrame} from '../src/landscape/malinovaya-rock-plan.js';
import {MalinovayaRockModel} from '../src/landscape/malinovaya-rock-model.js';
import {WATER_TOWER} from '../src/landscape/water-tower-settings.js';
import {insideGeometry,distanceToLine} from '../src/resort-scene-data.js';
test('three distinct Malinovayas, exact new owner point and tower corrected onto its mapped building',()=>{
 assert.deepEqual(byId('malinovaya-2').coordinates,[58.306933,54.007729]);assert.equal(PLACES.filter(p=>p.id==='malinovaya-2').length,1);assert.equal(new Set(['malinovaya','malinovaya-2','malinovaya-3'].map(id=>byId(id).coordinates.join(','))).size,3);
 assert.deepEqual(byId('waterTower').coordinates,WATER_TOWER.center);assert.deepEqual(byId('waterTower').sourceCoordinates,[58.404897,53.970428]);assert.ok(insideGeometry(WATER_TOWER.center,WATER_TOWER.footprintCutout));
});
test('rock columns follow the mapped cliff, sample ground and dispose their bounded static geometry',()=>{
 const line=ROCK_SURFACES.features.find(f=>f.properties.osmId==='way/616057078').geometry.coordinates.map(rockFrame.toLocal),height=(x,y)=>900+x*.1+y*.02,columns=rockColumns(height);assert.ok(columns.length>30&&columns.length<150);
 for(const c of columns){assert.ok(distanceToLine([c.x,c.y],line)<.001);assert.ok(c.top>height(c.x,c.y));assert.ok(c.top-c.base<50);}
 let calls=0;const scene=new T.Scene(),m=new MalinovayaRockModel(scene,(x,y)=>{calls++;return height(x,y);});assert.ok(calls<400);assert.equal(m.group.children.length,1);assert.ok(m.group.children[0].geometry.attributes.position.count/3<15000);m.dispose();assert.equal(m.resources.size,0);assert.equal(scene.children.length,0);
});
