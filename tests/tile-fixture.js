import {test as base,expect} from '@playwright/test';
export async function relayTiles(page){
 await page.route(/^https:\/\/tiles\.(mapterhorn|openfreemap)\.(com|org)\//,async route=>{
  const response=await route.fetch({url:'http://127.0.0.1:4399/?url='+encodeURIComponent(route.request().url()),timeout:60000});await route.fulfill({response});
 });
}
export const test=base.extend({page:async({page},use)=>{
 await relayTiles(page);
 await use(page);await page.unrouteAll({behavior:'ignoreErrors'});
}});
export {expect};
