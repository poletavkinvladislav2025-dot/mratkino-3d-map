import test from 'node:test';import assert from 'node:assert/strict';
import {loadYandexSDK} from '../src/integration/yandex-sdk.js';
class Script extends EventTarget{constructor(){super();this.dataset={};this.src='';}remove(){this.removed=true;}}
function fixture(){const scripts=[],w={},d={baseURI:'https://visitbeloretsk.ru/map',scripts,createElement:()=>new Script(),head:{append:s=>scripts.push(s)}};return {window:w,document:d,scripts};}
const sdk=()=>({ready:fn=>fn(),Map:class{},Placemark:class{}});
test('in-flight keyed Tilda SDK is reused by concurrent maps without a second keyless bootstrap',async()=>{
 const e=fixture(),existing=new Script();existing.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=test-public-key';e.scripts.push(existing);const a=loadYandexSDK({},e),b=loadYandexSDK({},e);assert.equal(a,b);assert.equal(e.scripts.length,1);e.window.ymaps=sdk();existing.dispatchEvent(new Event('load'));const result=await a;assert.equal(result.diagnostics.reused,true);assert.equal(result.diagnostics.keyStatus,'configured');assert.equal(e.scripts.length,1);
});
test('a failed owned SDK can be retried, and an explicit key remains in the only new bootstrap',async()=>{
 const e=fixture();const fail=loadYandexSDK({yandexApiKey:'test-public-key'},e);assert.equal(new URL(e.scripts[0].src).searchParams.get('apikey'),'test-public-key');e.scripts[0].dispatchEvent(new Event('error'));await assert.rejects(fail,{code:'YANDEX_SDK_LOAD_FAILED'});assert.equal(e.scripts[0].removed,true);const retry=loadYandexSDK({yandexApiKey:'test-public-key'},e);e.window.ymaps=sdk();e.scripts[1].dispatchEvent(new Event('load'));assert.equal((await retry).diagnostics.keyStatus,'configured');
});
test('a preloaded API is not reloaded; missing key is reported honestly without inventing a credential',async()=>{
 const e=fixture();e.window.ymaps=sdk();const r=await loadYandexSDK({},e);assert.equal(e.scripts.length,0);assert.equal(r.diagnostics.keyStatus,'missing');assert.equal(r.diagnostics.reused,true);
});
test('an unavailable foreign bootstrap times out without silently inserting another SDK',async()=>{
 const e=fixture(),s=new Script();s.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU';e.scripts.push(s);await assert.rejects(loadYandexSDK({sdkTimeoutMs:15},e),{code:'YANDEX_SDK_TIMEOUT'});assert.equal(e.scripts.length,1);
});

test('an explicit key cannot silently reconfigure an already loaded keyless API',async()=>{const e=fixture(),s=new Script();s.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU';e.scripts.push(s);e.window.ymaps=sdk();const r=await loadYandexSDK({yandexApiKey:'test-public-key'},e);assert.equal(r.diagnostics.keyStatus,'conflict');assert.equal(e.scripts.length,1);});
