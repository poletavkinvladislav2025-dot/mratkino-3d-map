/* Inside the Yandex IIFE, before initMap(). The generated complete block installs this automatically. */
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
  markers.forEach(function(m){m.placemark.options.set('visible',m.type==='kiosk'&&m.data.sellsPassports!==false&&m.dataId!=='stampStation');});
}
function vbFitView(view){
  clearTimeout(repositionTimer);clearTimeout(vbPlaceTimer);vbPendingPlace=null;
  panel.classList.remove('vb-t1__panel--open','vb-t1__panel--places');
  deselectMarker();
  if(view==='places'){map.setBounds([[53.75,58.25],[54.07,58.72]],{checkZoomRange:true,zoomMargin:45,duration:400});return;}
  var points=markers.filter(function(m){return m.type==='kiosk'&&(view!=='passport'||m.data.sellsPassports!==false&&m.dataId!=='stampStation');}).map(function(m){return m.data.coords;});
  if(!points.length)return;
  if(points.length===1){map.setCenter(points[0],15,{duration:400});return;}
  var bounds=points.reduce(function(b,p){return [[Math.min(b[0][0],p[0]),Math.min(b[0][1],p[1])],[Math.max(b[1][0],p[0]),Math.max(b[1][1],p[1])]];},[[90,180],[-90,-180]]);
  map.setBounds(bounds,{checkZoomRange:true,zoomMargin:60,duration:400});
}
window.VisitBeloretskYandex={
  version:1,
  getCamera:function(){return map?{center:map.getCenter(),zoom:map.getZoom(),bounds:map.getBounds()}:null;},
  getState:function(){return map?vbYandexState():null;},
  canonicalId:function(id){var p=locations.concat(stampPoints).find(function(p){return p.id===id;});return p?.canonicalId;},
  hasPlace:function(id){return locations.some(function(p){return p.id===id;})||stampPoints.some(function(p){return p.id===id;});},
  setFilter:function(view,options){
    if(!map||['places','stamps','passport'].indexOf(view)<0)return false;
    vbYandexMuted++;
    try{switchTab(view==='places'?'places':'stamps',false,false);vbPassportOnly=view==='passport';vbApplyPassportVisibility();if(options&&options.focus)vbFitView(view);}
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
