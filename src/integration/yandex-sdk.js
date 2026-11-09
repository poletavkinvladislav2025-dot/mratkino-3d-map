/** One shared SDK bootstrap per document, including an in-flight Tilda bootstrap. */
export function loadYandexSDK(config={},environment={window,document}){
 const w=environment.window,d=environment.document,key=String(config.yandexApiKey||w.VisitBeloretskYandexConfig?.apiKey||'').trim(),slot='__vbYandexSdkV1';
 const state=w[slot]||(w[slot]={promise:null});if(state.promise)return state.promise;
 const bootstraps=[...d.scripts].filter(s=>{try{const u=new URL(s.src,d.baseURI);return u.hostname==='api-maps.yandex.ru'&&/^\/2\.1\/?$/.test(u.pathname)&&(!u.searchParams.get('ns')||u.searchParams.get('ns')==='ymaps')&&s.dataset.vbSdkFailed!=='1';}catch{return false;}});
 const matching=bootstraps.find(s=>new URL(s.src,d.baseURI).searchParams.get('apikey')===key&&key),script=matching||bootstraps.find(s=>new URL(s.src,d.baseURI).searchParams.has('apikey'))||bootstraps[0];
 const existingKey=script?new URL(script.src,d.baseURI).searchParams.get('apikey'):null;
 const diagnostics={reused:!!(script||w.ymaps),duplicateBootstraps:Math.max(0,bootstraps.length-1),keyStatus:bootstraps.length>1?'multiple':key&&(script||w.ymaps)&&key!==existingKey?'conflict':existingKey||key?'configured':'missing'};
 let owned=null;
 state.promise=new Promise((resolve,reject)=>{
  let finished=false,readyPending=false,poll,timer;let active=script;
  const cleanup=()=>{clearTimeout(timer);clearTimeout(poll);active?.removeEventListener('load',check);active?.removeEventListener('error',failed);};
  const fail=code=>{if(finished)return;finished=true;cleanup();if(active)active.dataset.vbSdkFailed='1';const e=new Error(code);e.code=code;reject(e);};
  const failed=()=>fail('YANDEX_SDK_LOAD_FAILED');
  function check(){if(finished||readyPending)return;const sdk=w.ymaps;if(sdk?.ready){readyPending=true;try{sdk.ready(()=>{if(finished)return;if(typeof sdk.Map!=='function'||typeof sdk.Placemark!=='function'){fail('YANDEX_SDK_INCOMPLETE');return;}finished=true;cleanup();resolve({sdk,diagnostics});},()=>fail('YANDEX_SDK_INIT_FAILED'));}catch{fail('YANDEX_SDK_INIT_FAILED');}}else{clearTimeout(poll);poll=setTimeout(check,100);}}
  if(!active&&!w.ymaps){active=owned=d.createElement('script');active.dataset.vbYandexSdk='1';const url=new URL('https://api-maps.yandex.ru/2.1/');url.searchParams.set('lang','ru_RU');if(key)url.searchParams.set('apikey',key);active.src=url.href;active.async=true;}
  active?.addEventListener('load',check);active?.addEventListener('error',failed);timer=setTimeout(()=>fail('YANDEX_SDK_TIMEOUT'),config.sdkTimeoutMs||20000);
  if(owned)d.head.append(owned);check();
 });
 state.promise.catch(()=>{state.promise=null;if(owned)owned.remove();});return state.promise;
}
