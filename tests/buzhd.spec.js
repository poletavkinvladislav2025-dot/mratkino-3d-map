import {test,expect} from './tile-fixture.js';
for(const viewport of [{width:1365,height:900},{width:375,height:812}])test('BUZHD fits full geometry, opens line history and draws a moving steam train '+viewport.width,async({page})=>{
 test.setTimeout(180000);await page.setViewportSize(viewport);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?place=buzhd');const app=page.locator('mratkino-map');await expect(app).toHaveAttribute('data-map-state','ready',{timeout:60000});await expect(app).toHaveAttribute('data-place','buzhd');
 await expect.poll(()=>app.evaluate(h=>h.map.isMoving())).toBe(false);
 const frame=await app.evaluate(h=>{const m=h.map,r=m.getContainer().getBoundingClientRect(),bounds=[[57.3473, 53.76016], [58.60646, 54.6106]];return {width:r.width,height:r.height,points:bounds.map(p=>{const q=m.project(p);return [q.x,q.y];}),terrain:m.getTerrain(),source:m.getStyle().sources.buzhd};});
 for(const [x,y] of frame.points){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(frame.width);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(frame.height);}
 expect(frame.terrain.exaggeration).toBe(1);expect(frame.source.attribution).toContain('участники OpenStreetMap');
 await app.evaluate(h=>{h.map.jumpTo({center:[58.59418,54.22092],zoom:16.5,pitch:55,bearing:0,padding:{top:60,bottom:40,left:40,right:40}});h.region.buzhd.sync();});
 await expect.poll(()=>app.evaluate(h=>!!h.region.buzhd.scene),{timeout:60000}).toBe(true);
 await expect(app).toHaveAttribute('data-buzhd-trains','1',{timeout:60000});
 const before=await app.evaluate(h=>{const s=h.region.buzhd.scene;return {d:s.elapsed,position:s.moving.position.toArray(),path:s.selected.path.osmWay};});
 await expect.poll(()=>app.evaluate(h=>h.region.buzhd.scene.elapsed),{timeout:15000}).toBeGreaterThan(before.d+.3);
 const after=await app.evaluate(h=>h.region.buzhd.scene.moving.position.toArray());expect(after).not.toEqual(before.position);
 // Hit a real rendered line, including terrain projection, instead of invoking popup code directly.
 await expect.poll(()=>app.evaluate(h=>h.map.queryRenderedFeatures({layers:['buzhd-solid']}).length),{timeout:45000}).toBeGreaterThan(0);
 await app.evaluate(h=>{const m=h.map;const points=m.queryRenderedFeatures({layers:['buzhd-solid']}).flatMap(f=>f.geometry.coordinates);const p=points.find(p=>{const q=m.project(p);return q.x>30&&q.x<m.getContainer().clientWidth-40&&q.y>70&&q.y<m.getContainer().clientHeight-60;});if(!p)throw Error('No visible railway vertex');m.fire('click',{point:m.project(p),lngLat:{lng:p[0],lat:p[1]},originalEvent:new MouseEvent('click')});});
 await expect(app.locator('.route-name-popup')).toContainText('Рельсы сняты');await expect(app.locator('.route-name-popup a')).toHaveAttribute('href','https://visitbeloretsk.ru/uzkokoleyka');
 await app.evaluate(h=>{h.region.buzhd.trains=false;h.region.buzhd.sync();});await expect(app).toHaveAttribute('data-buzhd-trains','0');
 await app.evaluate(h=>h.region.choose('gr231',false));await expect(app).toHaveAttribute('data-place','narrowGauge2');await expect(app.locator('.route-name-popup')).toHaveCount(0);await expect(app).toHaveAttribute('data-buzhd-train-model','true',{timeout:45000});
 await expect(app.locator('.region-panel')).toContainText('Паровоз ГР-231');await expect(app.locator('.region-panel').getByRole('link',{name:'История дороги →',exact:true})).toHaveAttribute('href','https://visitbeloretsk.ru/uzkokoleyka');
 await page.screenshot({path:'/tmp/buzhd-'+viewport.width+'.png'});await page.emulateMedia({reducedMotion:'reduce'});await app.evaluate(h=>{h.region.buzhd.trains=true;h.region.buzhd.sync();});await expect(app).toHaveAttribute('data-buzhd-trains','0');expect(errors).toEqual([]);
});
