import test from 'node:test';
import assert from 'node:assert/strict';
import {addBuzhdLayers,validateBuzhd,BUZHD_POINTS,BUZHD_LINES,buzhdPopupContent} from '../src/region/buzhd.js';
import fs from 'node:fs';
import {trainPaths,trainSample,steamTrain} from '../src/region/buzhd-trains.js';
import {PLACES,byId} from '../src/region/presets.js';
import {stampsForPlace,sourceCoordinates} from '../src/region/passport.js';
import {readURLState} from '../src/region/integration.js';
test('BUZHD keeps disconnected source geometry and derives bounds from every component',()=>{
 const feature=(line,coordinates,type='LineString',structure)=>({type:'Feature',properties:{line,structure},geometry:{type,coordinates}});
 const data={type:'FeatureCollection',features:[feature('north',[[58.1,54],[58.2,54.1]]),feature('south',[[[58.5,53.9],[58.6,54]],[[59,54.5],[59.1,54.6]]],'MultiLineString'),feature('peat',[[58,54],[58.1,54.1]],'LineString','мост')]};
 const before=JSON.stringify(data),style={sources:{},layers:[],terrain:{source:'dem'}};
 assert.deepEqual(addBuzhdLayers(style,data),[[58,53.9],[59.1,54.6]]);
 assert.equal(JSON.stringify(data),before);assert.equal(style.sources.buzhd.data,data);assert.equal(style.sources.buzhd.tolerance,0);assert.deepEqual(style.terrain,{source:'dem'});
 assert.deepEqual(style.layers.find(l=>l.id==='buzhd-peat').paint['line-dasharray'],[2,8/3]);assert.equal(style.layers.find(l=>l.id==='buzhd-peat-structure').paint['line-width'],6);
 assert.match(style.sources.buzhd.attribution,/OpenStreetMap.*ODbL/);
});
test('published BUZHD is the unaltered owner collection; new points keep old IDs and stamp assignments',()=>{
 const bytes=fs.readFileSync('data/buzhd.geojson');assert.deepEqual(fs.readFileSync('public/region/buzhd/buzhd.geojson'),bytes);
 const data=JSON.parse(bytes);assert.equal(data.features.length,90);assert.equal(data.features.filter(f=>f.geometry.type==='LineString').length,83);
 assert.deepEqual(validateBuzhd(data),[[57.3473, 53.76016], [58.60646, 54.6106]]);
 assert.equal(readURLState('?place=buzhd').place,'buzhd');assert.equal(readURLState('?place=gr231').place,'narrowGauge2');
 assert.deepEqual(byId('gr231').coordinates,[58.33854,53.95218]);assert.deepEqual(sourceCoordinates(byId('narrowGauge2').sourceRecord),[58.404807,53.984282]);
 assert.match(byId('narrowGauge1').name,/Скальная выемка/);
 assert.deepEqual(stampsForPlace('narrowGauge1', PLACES).map(x=>x.point.id),['kiosk3']);
 assert.deepEqual(stampsForPlace('narrowGauge2', PLACES).map(x=>x.point.id),['kiosk8']);
});
test('steam trains sample individual source paths, never peat or gaps, and have four driving axles',()=>{
 const data=JSON.parse(fs.readFileSync('data/buzhd.geojson')),paths=trainPaths(data);assert.ok(paths.length>3);
 for(const path of paths){assert.ok(data.features.some(f=>f.properties.osm_way===path.osmWay&&['north','south','tukan'].includes(f.properties.line)));assert.deepEqual(trainSample(path,-1),path.points[0]);const end=trainSample(path,path.length+100);assert.ok(Math.hypot(end[0]-path.points.at(-1)[0],end[1]-path.points.at(-1)[1])<1e-10);}
 const model=steamTrain();assert.equal(model.wheels.filter(w=>w.position.z===.64).length,8);assert.ok(model.group.children.length<80);model.dispose();
});
test('BUZHD never substitutes unknown coordinates or builds an empty route',()=>{
 assert.throws(()=>validateBuzhd(null),/DATA_MISSING/);
 assert.throws(()=>validateBuzhd({type:'FeatureCollection',features:[]}),/DATA_MISSING/);
 assert.throws(()=>validateBuzhd({type:'FeatureCollection',features:[{type:'Feature',properties:{line:'north'},geometry:{type:'LineString',coordinates:[[null,54],[58,54]]}}]}),/INVALID_COORDINATE/);
 assert.deepEqual(BUZHD_POINTS.find(p=>p.id==='gr231').coordinates,[58.33854,53.95218]);
});
test('updated railway branches have distinct colors and today is shown as plain text',()=>{
 const style={sources:{},layers:[]};addBuzhdLayers(style,JSON.parse(fs.readFileSync('data/buzhd.geojson')));
 const solid=style.layers.find(l=>l.id==='buzhd-solid');for(const line of ['north','south','tukan','branch'])assert.ok(solid.paint['line-color'].includes(BUZHD_LINES[line].color));assert.equal(style.layers.find(l=>l.id==='buzhd-peat').paint['line-color'],'#D9921B');
 const saved=globalThis.document;globalThis.document={createElement:tag=>({tag,children:[],append(...items){this.children.push(...items);}})};
 try{const popup=buzhdPopupContent({section:'Южная линия',opened:'1912',closed:'2002',line:'south',today:'Станционная улица <img>'});assert.ok(popup.children.some(p=>p.textContent==='Сегодня здесь: Станционная улица <img>'));assert.deepEqual(byId('shushpa').coordinates,[58.4814,54.0816]);}finally{globalThis.document=saved;}
});
