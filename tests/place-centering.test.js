import test from 'node:test';import assert from 'node:assert/strict';import {visibleMapArea} from '../src/map-visible-area.js';
test('place focus uses the actual free rectangle left of a card or above the mobile sheet',()=>{
 const map={left:100,top:200,width:1200,height:600};assert.deepEqual(visibleMapArea(map,{left:950,top:220,width:330,height:560},'right'),{x:425,y:300,padding:{left:0,top:0,right:350,bottom:0}});assert.deepEqual(visibleMapArea(map,{left:110,top:550,width:1180,height:240},'bottom'),{x:600,y:175,padding:{left:0,top:0,right:0,bottom:250}});assert.equal(visibleMapArea(map).x,600);assert.equal(visibleMapArea(map).y,300);
});
