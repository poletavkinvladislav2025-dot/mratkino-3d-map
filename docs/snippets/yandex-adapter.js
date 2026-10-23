/* Paste INSIDE the existing Yandex IIFE, immediately BEFORE its final initMap(); */
var vbYandexMuted=0,vbPassportOnly=false,vbLastSnapshot='',vbPendingPlace=null,vbPlaceTimer;
function vbYandexState(){
  var selected=selectedIdx>=0?markers[selectedIdx]:null;
  return {view:currentTab==='places'?'places':vbPassportOnly?'passport':'stamps',sourceId:selected?selected.dataId:null};
}
function vbYandexNotify(){
  if(vbYandexMuted)return;
  var state=vbYandexState(),key=JSON.stringify(state);
  if(key===vbLastSnapshot)return;vbLastSnapshot=key;
  window.dispatchEvent(new CustomEvent('vb-yandex-change',{detail:state}));
}
function vbApplyPassportVisibility(){
  if(!vbPassportOnly)return;
  markers.forEach(function(m){m.placemark.options.set('visible',m.type==='kiosk'&&m.dataId!=='stampStation');});
}
window.VisitBeloretskYandex={
  version:1,
  getState:function(){return map?vbYandexState():null;},
  hasPlace:function(id){return locations.some(function(p){return p.id===id;})||stampPoints.some(function(p){return p.id===id;});},
  setFilter:function(view){
    if(!map||['places','stamps','passport'].indexOf(view)<0)return false;
    vbYandexMuted++;
    try{switchTab(view==='places'?'places':'stamps',false,false);vbPassportOnly=view==='passport';vbApplyPassportVisibility();}
    finally{vbYandexMuted--;}
    return true;
  },
  openPlace:function(id){
    if(!map||!this.hasPlace(id))return false;
    if(isTransitioning){vbPendingPlace=id;clearTimeout(vbPlaceTimer);vbPlaceTimer=setTimeout(function(){var next=vbPendingPlace;vbPendingPlace=null;window.VisitBeloretskYandex.openPlace(next);},260);return true;}
    var preservePassport=vbPassportOnly;vbYandexMuted++;
    try{if(stampPoints.some(function(p){return p.id===id;}))navToKiosk(id);else navToLoc(id);vbPassportOnly=preservePassport&&id!=='stampStation';vbApplyPassportVisibility();}
    finally{vbYandexMuted--;}
    return true;
  }
};
