import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {WaterTowerModel,WATER_TOWER} from '../src/landscape/water-tower.js';
import {LandscapeScene} from '../src/landscape/scene.js';
import {byId} from '../src/region/presets.js';
test('tower retains the existing point, has a bounded complete silhouette and frees its resources',()=>{
 assert.deepEqual(WATER_TOWER.center,byId('waterTower').coordinates);const scene=new T.Scene(),m=new WaterTowerModel(scene),box=new T.Box3().setFromObject(m.group);assert.ok(Math.abs(box.max.z-WATER_TOWER.height)<.01);assert.ok(box.min.z>=-.01);assert.ok(box.max.x>4&&box.max.x<5);assert.ok(m.group.children.length<=12);let triangles=0,disposed=0;for(const mesh of m.group.children){triangles+=mesh.geometry.attributes.position.count/3;assert.equal(mesh.material.side,T.DoubleSide);}assert.ok(triangles<20000);for(const r of m.resources)r.addEventListener('dispose',()=>disposed++);const count=m.resources.size;m.dispose();assert.equal(disposed,count);assert.equal(m.resources.size,0);assert.equal(scene.children.length,0);
});
test('tower waits for terrain, reuses geometry when ground elevation changes and disposes on hiding',()=>{
 let z=null,loaded=false;const s=new LandscapeScene({}, {}, {budget:{trees:10},onStats(){}});s.scene=new T.Scene();s.units=1;s.ml={MercatorCoordinate:{fromLngLat:()=>({meterInMercatorCoordinateUnits:()=>1})}};s.local=()=>[10,20];s.map={isSourceLoaded:()=>loaded,queryTerrainElevation:()=>z,triggerRepaint(){}};
 s.showWaterTower(true);assert.ok(!s.tower);loaded=true;s.showWaterTower(true);assert.ok(!s.tower);z=500;s.showWaterTower(true);const model=s.tower;assert.equal(model.group.position.z,500);z=505;s.showWaterTower(true);assert.equal(s.tower,model);assert.equal(model.group.position.z,505);s.showWaterTower(false);assert.equal(s.tower,null);assert.equal(model.resources.size,0);
});
