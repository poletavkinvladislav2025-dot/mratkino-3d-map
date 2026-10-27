/* The SDK writes styles to document.head. Mirror only its rules into this map's shadow root. */
function mirrorYandexStyles(scope){
 const copies=new Map();let scheduled=false;
 function sync(){
  scheduled=false;
  for(const original of document.head.querySelectorAll('style,link[rel="stylesheet"]')){
   let css='';
   if(original.tagName==='STYLE'){
    css=original.textContent||'';
    // Some SDK versions populate the CSSOM with insertRule instead of text nodes.
    try{if(original.sheet?.cssRules.length)css=Array.from(original.sheet.cssRules,r=>r.cssText).join('\n');}catch{}
    if(!/\.ymaps-\d/.test(css))continue;
   }else{
    let host;try{host=new URL(original.href).hostname;}catch{continue;}
    if(!/(^|\.)yandex\.(ru|net)$/.test(host))continue;
   }
   let copy=copies.get(original);
   if(!copy){copy=document.createElement(original.tagName==='STYLE'?'style':'link');if(copy.tagName==='LINK'){copy.rel='stylesheet';copy.href=original.href;}scope.prepend(copy);copies.set(original,copy);}
   if(copy.tagName==='STYLE'&&copy.textContent!==css)copy.textContent=css;
  }
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}
 new MutationObserver(schedule).observe(document.head,{childList:true,subtree:true,characterData:true});
 scope.addEventListener('vb-yandex-ready',()=>{sync();schedule();});sync();
}
