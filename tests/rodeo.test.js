import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {rodeoPlan,freestylePose,freestyleAltitude,sampledRodeoGround} from '../src/landscape/rodeo-plan.js';import {RodeoModel} from '../src/landscape/rodeo-model.js';
test('illustration stays beside the lift, fills the whole slope, and follows height without per-frame terrain queries',()=>{
 const bounds=p=>[Math.min(...p.zone.map(x=>x[0])),Math.max(...p.zone.map(x=>x[0])),Math.min(...p.zone.map(x=>x[1])),Math.max(...p.zone.map(x=>x[1]))];const a=bounds(rodeoPlan((x,y)=>y)),b=bounds(rodeoPlan((x,y)=>-y));a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<1e-9));
 const plan=rodeoPlan(),height=(x,y)=>400+x*.02+y*.1,ground=sampledRodeoGround(plan,height);for(let d=0;d<plan.length;d+=17)assert.ok(Math.abs(ground(...plan.point(12,d))-height(...plan.point(12,d)))<1e-8);
 for(const n of [48,96]){const poses=Array.from({length:n},(_,i)=>freestylePose(plan,i,0,n));assert.ok(Math.max(...poses.map(p=>p.d))>plan.length*.85);assert.equal(poses.filter(p=>p.board).length,n/2);assert.ok(poses.some(p=>p.lane===0&&p.board)&&poses.some(p=>p.lane===0&&!p.board));for(const p of poses)assert.ok(p.d>=0&&p.d<=plan.length);}
 let calls=0;const scene=new T.Scene(),m=new RodeoModel(scene,(x,y)=>{calls++;return height(x,y);});const initial=calls;m.update(.1);m.update(.1);assert.equal(calls,initial);assert.equal(m.count,96);assert.equal(m.features.airbags,1);assert.equal(m.features.kickers,11);assert.ok(m.group.children.filter(o=>o.isMesh).length<30);m.dispose();assert.equal(scene.children.length,0);assert.equal(m.resources.size,0);
});
test('jump reaches the airbag, performs rotations and lands continuously on its surface',()=>{
 const p=rodeoPlan(),cycle=28;const at=d=>{const phase=d/p.length,time=(phase-.35/16)*cycle;return freestylePose(p,0,time);};
 const launch=p.bag.d-22,a=at(launch+.0001),b=at(launch-.0001),land=at(p.bag.d),before=at(p.bag.d-.0001),height=()=>400;assert.ok(Math.abs(freestyleAltitude(p,a,height)-freestyleAltitude(p,b,height))<.001);assert.ok(Math.abs(freestyleAltitude(p,land,height)-freestyleAltitude(p,before,height))<.001);const air=at(launch+11);assert.ok(air.airborne&&air.jumpHeight>6&&air.spin>0&&air.flip>0);assert.ok(Math.abs(land.d-p.bag.d)<1e-8);
});
