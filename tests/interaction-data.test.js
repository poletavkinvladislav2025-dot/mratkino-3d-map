import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {tileCells,project,WORLD} from '../src/landscape/spatial.js';
import {LandscapeController} from '../src/landscape/controller.js';
import {HikingController} from '../src/region/hiking.js';
import {CatalogController} from '../src/region/catalog-controller.js';
import {PLACES} from '../src/region/presets.js';
function exhaustive(center,bounds,z,limit){const n=2**z,size=WORLD/n,c=project(center),[[w,s],[e,north]]=bounds,a=project([w,north]),b=project([e,s]),cells=[];for(let x=Math.max(0,Math.floor(a[0]/size)-1);x<=Math.min(n-1,Math.floor(b[0]/size)+1);x++)for(let y=Math.max(0,Math.floor(a[1]/size)-1);y<=Math.min(n-1,Math.floor(b[1]/size)+1);y++)cells.push({x,y,z,id:`${z}/${x}/${y}`,distance:Math.hypot((x+.5)*size-c[0],(y+.5)*size-c[1])});return cells.sort((a,b)=>a.distance-b.distance).slice(0,limit);}
test('nearest forest cells match exhaustive selection without enumerating a horizon-sized world',()=>{
 for(let i=0;i<100;i++){const c=[58+i/701,54-i/1591],bounds=[[c[0]-.05,c[1]-.025],[c[0]+.045,c[1]+.03]],cap=i%9+1;assert.deepEqual(tileCells(c,bounds,14,cap),exhaustive(c,bounds,14,cap));}
 const started=performance.now(),cells=tileCells([58.5,54],[[-180,-85],[180,85]],14,9);assert.equal(cells.length,9);assert.equal(new Set(cells.map(c=>c.id)).size,9);assert.ok(performance.now()-started<500);assert.ok(cells.every(c=>Math.abs(c.x-cells[0].x)<=2&&Math.abs(c.y-cells[0].y)<=2));
 assert.deepEqual(tileCells([NaN,54],[[0,0],[1,1]],14,9),[]);
});
test('static forest does not re-upload matrices; moving cameras defer rebuilds and changed terrain invalidates the cache',()=>{
 const saved=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:false});try{
  let moving=false,uploads=0,lon=58.5;const scene={stats:{trees:1},elevations:new Map(),setSaplings(){},setTrees(){uploads++;},setForest(){},showPark(){},setAnimation(){}};
  const host={resortLoaded:false,map:{isMoving:()=>moving,getCenter:()=>({toArray:()=>[lon,54.08]}),getZoom:()=>15.2},$:()=>({checked:true}),setAttribute(){}};
  const region={host,ski:{},filters:{interesting:true},season:'winter',updateLoadStatus(){}};const c=new LandscapeController(region);c.scene=scene;c.selected=['cell'];c.cache.set('cell',{points:[[58.5,54.08,1,3]]});
  c.redraw();assert.equal(uploads,1);for(let i=0;i<20;i++)c.redraw();assert.equal(uploads,1);moving=true;lon+=.001;c.redraw();assert.equal(uploads,1);moving=false;c.redraw();assert.equal(uploads,2);c.refreshGround();assert.equal(uploads,3);
 }finally{globalThis.matchMedia=saved;}
});
test('unchanged hiking and catalog routes avoid worker messages; data, filters and selection still invalidate them',()=>{
 const posted={};const sources=new Map(['hiking-routes','hiking-stops','winter-catalog'].map(id=>[id,{setData:data=>{posted[id]=(posted[id]||0)+1;}}]));const host={map:{getSource:id=>sources.get(id)},region:{routeId:null},$:()=>({checked:true})};
 const h=new HikingController(host);h.visible=new Set(['yalangas']);h.datasets.set('yalangas',JSON.parse(fs.readFileSync('public/region/hiking/yalangas/routes.geojson')));h.draw();for(let i=0;i<20;i++)h.draw();assert.equal(posted['hiking-routes'],1);host.region.routeId='yalangas/a1';h.draw();assert.equal(posted['hiking-routes'],2);
 const region={host,filters:{ski:true,nordic:true},routeId:null},c=new CatalogController(region),place=PLACES.find(p=>p.id==='bannoye');c.active=['bannoye'];c.datasets.bannoye=JSON.parse(fs.readFileSync('public/'+place.geometryUrl));c.layers();for(let i=0;i<20;i++)c.layers();assert.equal(posted['winter-catalog'],1);region.filters.ski=false;c.layers();assert.equal(posted['winter-catalog'],2);
});
