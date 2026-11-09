import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {LANDMARKS,landmarkColumns} from '../src/landscape/landmark-plan.js';
import {MooseMonument} from '../src/landscape/moose-model.js';
import {MalinovayaRockModel} from '../src/landscape/malinovaya-rock-model.js';
import {byId} from '../src/region/presets.js';
test('landmark anchors retain owner coordinates and extra Malinovaya rocks use distinct mapped cliffs',()=>{
 const seen=new Set();
 for(const p of LANDMARKS){assert.deepEqual(p.center,byId(p.id).coordinates);if(p.kind!=='rocks')continue;const columns=landmarkColumns(p,()=>1000);assert.ok(columns.length>15&&columns.length<250);for(const f of p.features){assert.ok(/^way\/\d+$/.test(f.properties.osmId));assert.ok(!seen.has(f.properties.osmId));seen.add(f.properties.osmId);}for(const c of columns){assert.ok(c.top>1000);assert.ok(c.top-c.base<40);}const scene=new T.Scene(),model=new MalinovayaRockModel(scene,()=>1000,{id:p.id,columns:h=>landmarkColumns(p,h)});assert.equal(model.group.children.length,1);model.dispose();assert.equal(scene.children.length,0);}
});
test('moose monument has a cow, bull and calf with bounded geometry and disposes all resources',()=>{
 const scene=new T.Scene(),model=new MooseMonument(scene);assert.deepEqual(model.animals.map(a=>a.name),['cow','bull','calf']);assert.equal(model.animals[1].children.length,3);assert.equal(model.animals[0].children.length,2);let triangles=0;model.group.traverse(o=>{if(o.isMesh)triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;});assert.ok(triangles>1000&&triangles<20000);model.dispose();assert.equal(model.resources.size,0);assert.equal(scene.children.length,0);
});
