import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {directionRoute,directionPlace} from '../src/region/directions.js';
const audit=JSON.parse(fs.readFileSync('data/directions/source/kurtash-station/source-audit.json'));
const original=fs.readFileSync('data/directions/source/kurtash-station/exje-2017-original.gpx');
const points=xml=>[...String(xml).matchAll(/<trkpt\s+([^>]+)>/g)].map(m=>{const attr=name=>Number(m[1].match(new RegExp(name+'="([^"]+)"'))[1]);return [attr('lon'),attr('lat')];});
test('Kurtash station route uses the recorded ascent verbatim, without the 24.6 km router detour or invented closures',()=>{
 assert.equal(crypto.createHash('sha256').update(original).digest('hex'),audit.originalSha256);
 const all=points(original),ascent=all.slice(0,audit.ascentEndIndex+1),geo=JSON.parse(fs.readFileSync('public/region/directions/routes.geojson')),feature=geo.features.find(f=>f.properties.id===audit.routeId),route=directionRoute(audit.routeId);
 assert.equal(all.length,2182);assert.equal(ascent.length,1135);assert.deepEqual(feature.geometry.coordinates,ascent);assert.deepEqual(points(fs.readFileSync('public/region/directions/kurtashtau-station.gpx')),ascent);
 assert.equal(feature.geometry.type,'LineString');assert.equal(route.geometrySource,'source_gpx');assert.equal(route.revision,2);assert.equal(route.checkedAt,'2026-11-14');assert.ok(route.lineDistanceM>7900&&route.lineDistanceM<8100);assert.ok(Math.abs(route.distanceM-2*route.lineDistanceM)<=1);assert.equal(route.displayDistanceM,route.lineDistanceM);
 assert.ok(audit.summitGapM<15);assert.ok(audit.largestAscentStepM<30);assert.ok(audit.originalEndToStartM>900);assert.notDeepEqual(ascent.at(-1),all.at(-1));assert.equal(directionPlace('kurtashtau').defaultRouteId,audit.routeId);
 assert.deepEqual(route.points.find(p=>p.id===route.startPointId).coordinates,ascent[0]);assert.deepEqual(route.referencePoints.find(p=>p.id==='uraltau-station').coordinates,[58.568172,53.976154]);assert.equal(route.referencePoints.find(p=>p.id==='uraltau-station').role,'reference');assert.deepEqual(route.points.find(p=>p.id==='kurtash-top').coordinates,[58.573598,53.927395]);
 assert.equal(route.sourceUrl,'https://www.exje.ru/mnt-kurtashtau/');assert.equal(route.downloadLabel,'GPX подъёма ↗');assert.match(route.description,/2017/);assert.match(route.description,/действующим железнодорожным путям/);assert.match(route.notes,/обрывается/);assert.doesNotMatch(route.description,/Линию провела карта/);
 const catalog=JSON.parse(fs.readFileSync('public/integration/route-catalog.json'));assert.equal(catalog.routes.find(r=>r.id===audit.routeId).sourceGeometrySha256,route.sourceGeometrySha256);
});
