import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {KRAKA_A,KRAKA_B} from '../src/region/kraka.js';import {byId} from '../src/region/presets.js';import {cameraPayload,readURLState} from '../src/region/integration.js';
test('new Kraka anchors do not overwrite the old passport reference or pretend the old trail ends at B',()=>{
 assert.deepEqual(KRAKA_A,[58.195555,53.807985]);assert.deepEqual(KRAKA_B,[58.141468,53.818296]);assert.deepEqual(byId('bolshoy-kraka').coordinates,KRAKA_B);assert.deepEqual(byId('kraka').coordinates,[58.039331,53.605817]);
 const track=JSON.parse(fs.readFileSync('public/region/kraka/but-track.geojson')).features[0];assert.equal(track.properties.verified,false);assert.equal(track.geometry.coordinates.length,460);assert.deepEqual(track.geometry.coordinates.at(-1),[58.039363,53.60574]);assert.notDeepEqual(track.geometry.coordinates.at(-1),KRAKA_B);
 assert.deepEqual(cameraPayload({pitch:85}),{pitch:85});assert.equal(cameraPayload({pitch:85.1}),null);assert.equal(readURLState('?place=bolshoy-kraka&pitch=85').camera.pitch,85);
});

import {createExpression} from '@maplibre/maplibre-gl-style-spec';import {createRegionalStyle} from '../src/region/style.js';
test('building heights use measured properties and a 6 m fallback rather than converting missing heights to zero',()=>{
 const style=createRegionalStyle({manifest:JSON.parse(fs.readFileSync('public/live/manifest.json'))},null);const layer=style.layers.find(l=>l.id==='region-buildings-3d');
 const result=createExpression(layer.paint['fill-extrusion-height'],'layers[0].paint.fill-extrusion-height');assert.equal(result.result,'success');const height=properties=>result.value.evaluate({zoom:16},{properties});
 assert.equal(height({render_height:24}),24);assert.equal(height({height:'18'}),18);assert.equal(height({}),6);assert.equal(height({render_height:null}),6);
});
