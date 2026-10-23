import {test,expect} from './tile-fixture.js';
const root=p=>p.locator('mratkino-map');
async function ready(page,place='all'){
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?place='+encodeURIComponent(place)+'&effects=0');
 await expect(root(page)).toHaveAttribute('data-map-state','ready',{timeout:90000});
 await expect.poll(()=>root(page).evaluate(e=>!!e.region.bootstrapped),{timeout:90000}).toBe(true);
}
test('all imported cards, explicit two-way stamp links, separated original IDs and historical point',async({page})=>{
 test.setTimeout(300000);await page.setViewportSize({width:1365,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page,'factoryWhistle');
 const card=page.locator('.region-panel');await expect(card).toContainText('крыше котельной №1');await expect(card.locator('.passport-links li')).toHaveCount(2);
 await card.getByRole('button',{name:'Поставить штамп: Центральная площадь',exact:true}).click();await expect(root(page)).toHaveAttribute('data-place','kiosk3');await expect(card.locator('.passport-links li')).toHaveCount(21);await expect(card).toContainText('при покупке сувенира');
 await card.getByRole('button',{name:'Открыть место: Белорецкий заводской гудок',exact:true}).click();await expect(root(page)).toHaveAttribute('data-place','factoryWhistle');
 for(const [input,canonical] of [['malinovaya1','malinovaya'],['yandex:malinovaya','malinovaya-3'],['narrowGauge1','narrowGauge1'],['narrowGauge2','narrowGauge2'],['beloretskFactory','beloretskFactory']]){await root(page).evaluate((e,id)=>e.region.choose(id,false),input);await expect(root(page)).toHaveAttribute('data-place',canonical);}
 await root(page).evaluate(e=>e.region.choose('lostSymbol',false));await expect(card).toContainText('Объект утрачен');expect(await root(page).evaluate(e=>e.map.getStyle().layers.some(l=>l.type==='fill-extrusion'))).toBe(false);
 await root(page).evaluate(e=>e.region.choose('stampStation',false));await expect(card.locator('.passport-links li')).toHaveCount(1);await expect(card).toContainText('Паспорт здесь не продаётся');expect(await card.getByRole('button',{name:/Открыть место/}).count()).toBe(0);
 await page.screenshot({path:'renders/passport-station-card.png',timeout:60000});expect(errors).toEqual([]);
});
test('Central square has two separately clickable pins; passport filter excludes the station',async({page})=>{
 test.setTimeout(240000);await page.setViewportSize({width:1365,height:900});await ready(page);expect(await page.locator('[data-category=passport]').isChecked()).toBe(false);
 await root(page).evaluate(e=>{e.map.jumpTo({center:[58.410239,53.967425],zoom:18,pitch:0,bearing:0});e.region.sync();});
 const station=page.locator('.stamp-pin[data-place-id=stampStation]'),kiosk=page.locator('.stamp-pin[data-place-id=kiosk3]');await expect(station).toBeVisible();await expect(kiosk).toBeVisible();
 const a=await station.boundingBox(),b=await kiosk.boundingBox();expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
 await page.screenshot({path:'renders/passport-central-square.png',timeout:60000});await station.click();await expect(root(page)).toHaveAttribute('data-place','stampStation');await page.getByRole('button',{name:'Закрыть карточку',exact:true}).click();await kiosk.click();await expect(root(page)).toHaveAttribute('data-place','kiosk3');
 await page.getByRole('button',{name:'Закрыть карточку',exact:true}).click();await page.getByRole('button',{name:'Слои карты',exact:true}).click();await page.locator('[data-category=interesting]').uncheck();await page.locator('[data-category=passport]').check();
 expect(await root(page).evaluate(e=>e.region.filters.stamps)).toBe(true);await expect(station).toBeHidden();await expect(kiosk).toBeVisible();
 await page.getByRole('button',{name:'Поиск мест',exact:true}).click();await page.getByRole('searchbox').fill('Карла Маркса');await expect(page.locator('.search-results button')).toHaveCount(2);
});
test('mobile source alias opens a complete card, filters remain one panel and navigation preserves motion preference',async({page})=>{
 test.setTimeout(240000);await page.setViewportSize({width:390,height:844});await ready(page,'yandex:malinovaya');await expect(root(page)).toHaveAttribute('data-place','malinovaya-3');
 const card=page.locator('.region-panel');await expect(card).toContainText('Третья');await expect(card.locator('.passport-links li')).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await root(page).evaluate(e=>{e.region.effectsWanted=true;e.region.motionExplicit=true;return e.region.choose('kiosk7',false);});await expect(card.locator('.passport-links li')).toHaveCount(10);await card.getByRole('button',{name:'Открыть место: Первая Малиновая',exact:true}).click();await expect(root(page)).toHaveAttribute('data-place','malinovaya');expect(await root(page).evaluate(e=>e.region.effectsWanted)).toBe(true);
 await page.getByRole('button',{name:'Закрыть карточку',exact:true}).click();await page.getByRole('button',{name:'Слои карты',exact:true}).click();await expect(page.locator('.category-filters')).toHaveCount(1);for(const id of ['interesting','stamps','passport'])await expect(page.locator('[data-category='+id+']')).toBeVisible();
 await page.screenshot({path:'renders/passport-mobile-filters.png',timeout:60000});
});
