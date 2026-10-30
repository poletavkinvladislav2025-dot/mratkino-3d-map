function mountYandex(catalog,config,scope){
  'use strict';

  // Cards and photos use the shared catalog generated from the 3D registry.
  scope.vbPlaces=catalog;

  var locations=catalog.filter(function(p){return p.kind!=='stamp-point';});
  var stampPoints=catalog.filter(function(p){return p.kind==='stamp-point';});
  var placeDescs={};

  var currentTab='places',selectedIdx=-1,currentImageIdx=0,isTransitioning=false,isFs=false;
  var ymaps=null,map=null,markers=[],vbRoutes=null;

  /* ═══ DOM ═══ */
  var panel=document.getElementById('vbT1Panel');
  var panelBody=document.getElementById('vbT1PanelBody');
  var mcard=document.getElementById('vbT1Mcard');
  var mcardBody=document.getElementById('vbT1McardBody');
  var mcardBodyInner=document.getElementById('vbT1McardBodyInner');
  var mcardName=document.getElementById('vbT1McardName');
  var tabBtns=document.querySelectorAll('.vb-t1__tab');
  var mapContainer=document.getElementById('vbT1MapContainer');
  var mapLoader=document.getElementById('vbT1Loader');
  var counterEl=document.getElementById('vbT1Counter');
  var mcardCounterEl=document.getElementById('vbT1McardCounter');

  /* ═══════════════════════════════════════════
     MARKER SVGs — Diamond + Station Star
     ═══════════════════════════════════════════ */
  var ENC=encodeURIComponent;

  function starPath(cx,cy,outerR,innerR){
    var pts=[];
    for(var i=0;i<10;i++){
      var r=i%2===0?outerR:innerR;
      var a=-Math.PI/2+(i*Math.PI/5);
      pts.push((cx+r*Math.cos(a)).toFixed(2)+' '+(cy+r*Math.sin(a)).toFixed(2));
    }
    return 'M '+pts[0]+' L '+pts.slice(1).join(' L ')+' Z';
  }

  function makeDiamondSvg(fill,w,h,active){
    var cx=w/2,cy=h/2;
    var path='M '+cx+' 0 L '+w+' '+cy+' L '+cx+' '+h+' L 0 '+cy+' Z';
    var sw=active?3:2.5;
    var inner='';
    if(active){
      var ir=Math.min(cx,cy)*0.36;
      inner='<circle cx="'+cx+'" cy="'+cy+'" r="'+ir+'" fill="none" stroke="white" stroke-width="2"/>';
    }else{
      var dr=Math.min(cx,cy)*0.26;
      inner='<circle cx="'+cx+'" cy="'+cy+'" r="'+dr+'" fill="white" opacity="0.9"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'">'
      +'<path d="'+path+'" fill="'+fill+'" stroke="white" stroke-width="'+sw+'" stroke-linejoin="round"/>'
      +inner+'</svg>';
  }

  function makeStationSvg(fill,w,h,active){
    var cx=w/2,cy=h/2;
    var path='M '+cx+' 0 L '+w+' '+cy+' L '+cx+' '+h+' L 0 '+cy+' Z';
    var sw=active?3:2.5;
    var oR=Math.min(cx,cy)*(active?0.38:0.32);
    var iR=oR*0.42;
    var star='<path d="'+starPath(cx,cy,oR,iR)+'" fill="white" opacity="0.95"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'">'
      +'<path d="'+path+'" fill="'+fill+'" stroke="white" stroke-width="'+sw+'" stroke-linejoin="round"/>'
      +star+'</svg>';
  }

  var GREEN='#1B4332',TERRA='#B85C38';

  var greenDef='data:image/svg+xml,'+ENC(makeDiamondSvg(GREEN,20,24,false));
  var terraDef='data:image/svg+xml,'+ENC(makeDiamondSvg(TERRA,20,24,false));
  var greenSel='data:image/svg+xml,'+ENC(makeDiamondSvg(GREEN,30,36,true));
  var terraSel='data:image/svg+xml,'+ENC(makeDiamondSvg(TERRA,30,36,true));
  var stationDef='data:image/svg+xml,'+ENC(makeStationSvg(TERRA,20,24,false));
  var stationSel='data:image/svg+xml,'+ENC(makeStationSvg(TERRA,30,36,true));

  function iconOffset(id,active){var d=id==='stampStation'?[-28,-16]:id==='kiosk3'?[28,16]:[0,0];return [(active?-15:-10)+d[0],(active?-36:-24)+d[1]];}

  function isStation(d){return d&&d.isStampFree===true;}

  var arrowSvg='<svg class="vb-t1__stamp-btn-arrow" viewBox="0 0 14 14" fill="none"><path d="M1 7h11M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var routeSvg='<svg class="vb-t1__route-link-icon" viewBox="0 0 12 12" fill="none"><path d="M1.5 10.5L10.5 1.5M10.5 1.5H4.5M10.5 1.5V7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var stampSvg='<svg class="vb-t1__stamp-icon" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M4 7.5L6.5 10L12 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ═══ Photo bank: чтение URL из статичных <img> элементов ═══ */
  function getPhotos(id){var p=catalog.find(function(p){return p.id===id;});return p?p.photos:[];}

  function renderGallery(data){
    var photos=getPhotos(data.id);
    if(!photos.length)return'';
    var h='<div class="vb-t1__gallery"><img class="vb-t1__gallery-img" src="'+photos[0].src+'" alt="'+(photos[0].alt||data.name||'')+'" loading="lazy">';
    if(photos.length>1){
      h+='<div class="vb-t1__gallery-nav">';
      h+='<button class="vb-t1__gallery-btn" data-dir="-1" aria-label="Назад"><svg class="vb-t1__gallery-icon" viewBox="0 0 14 14" fill="none"><path d="M9 1L3 7l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      h+='<span class="vb-t1__gallery-count">1 / '+photos.length+'</span>';
      h+='<button class="vb-t1__gallery-btn" data-dir="1" aria-label="Вперёд"><svg class="vb-t1__gallery-icon" viewBox="0 0 14 14" fill="none"><path d="M5 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      h+='</div>';
    }
    return h+'</div>';
  }

  function changePhoto(dir){
    if(selectedIdx<0)return;
    var photos=getPhotos(markers[selectedIdx].data.id);if(photos.length<2)return;
    currentImageIdx+=dir;
    if(currentImageIdx<0)currentImageIdx=photos.length-1;
    if(currentImageIdx>=photos.length)currentImageIdx=0;
    var c=document.getElementById('vbT1MapContainer').ownerDocument.documentElement.clientWidth>960?panelBody:mcardBodyInner;
    var img=c.querySelector('.vb-t1__gallery-img'),cnt=c.querySelector('.vb-t1__gallery-count');
    if(img)img.src=photos[currentImageIdx].src;
    if(cnt)cnt.textContent=(currentImageIdx+1)+' / '+photos.length;
  }

  /* ═══ Stamps ═══ */
  function renderStamps(sp,container){
    var grid=container.querySelector('.vb-t1__stamps-grid');
    var nav=container.querySelector('.vb-t1__stamps-nav');
    if(!grid)return;
    if(!sp.stamps||!sp.stamps.length){grid.innerHTML='';if(nav){nav.innerHTML='';nav.style.display='none';}return;}
    var h='';
    for(var i=0;i<sp.stamps.length;i++){
      if(sp.stamps[i].locationId)h+='<button class="vb-t1__stamps-pill" data-location-id="'+sp.stamps[i].locationId+'">'+sp.stamps[i].name+'</button>';
      else h+='<span class="vb-t1__stamps-pill vb-t1__stamps-pill--static">'+sp.stamps[i].name+'</span>';
    }
    grid.innerHTML=h;
    if(nav){nav.innerHTML='';nav.style.display='none';}
  }

  function closeModal(){var m=document.getElementById('vbT1Modal');if(m)m.classList.remove('vb-t1__modal--open');}

  /* ═══ Helpers ═══ */
  function findLoc(id){for(var i=0;i<locations.length;i++)if(locations[i].id===id)return locations[i];return null;}
  function findSp(id){for(var i=0;i<stampPoints.length;i++)if(stampPoints[i].id===id)return stampPoints[i];return null;}
  function getLocStamps(locId){
    var r=[];
    for(var k=0;k<stampPoints.length;k++){var sp=stampPoints[k];for(var s=0;s<sp.stamps.length;s++){if(sp.stamps[s].locationId===locId)r.push({name:sp.stamps[s].name,kioskId:sp.id,kioskName:sp.name});}}
    return r;
  }

  /* ═══ Render content ═══ */
  function renderContent(data,type){
    var h='';
    if(type==='location'){
      h+=renderGallery(data);
      h+='<div class="vb-t1__card-type">'+data.type+'</div>';
      if(data.url){
        h+='<h3 class="vb-t1__card-name"><a href="'+data.url+'">'+data.name+'<svg class="vb-t1__card-name-link-icon" viewBox="0 0 14 14" fill="none"><path d="M4.5 2h7.5v7.5M12 2L5 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a></h3>';
      }else{
        h+='<h3 class="vb-t1__card-name">'+data.name+'</h3>';
      }
      var locDesc=data.desc||placeDescs[data.id]||'';
      if(locDesc)h+='<p class="vb-t1__card-desc">'+locDesc+'</p>';
      h+='<a class="vb-t1__route-link" href="https://yandex.ru/maps/?pt='+data.coords[1]+','+data.coords[0]+'&z=16" target="_blank" rel="noopener noreferrer">Открыть в Яндекс Картах '+routeSvg+'</a>';
      var stamps=getLocStamps(data.id);
      if(stamps.length>0){
        h+='<div class="vb-t1__stamp-section">';
        for(var i=0;i<stamps.length;i++){
          h+='<div class="vb-t1__stamp-group">';
          h+='<div class="vb-t1__stamp-badge">'+stampSvg+' ШТАМП ЭТОГО МЕСТА</div>';
          h+='<div class="vb-t1__stamp-name">'+stamps[i].name+'</div>';
          h+='<div class="vb-t1__stamp-kiosk">Где поставить: <strong>'+stamps[i].kioskName+'</strong></div>';
          h+='<button class="vb-t1__stamp-btn" data-kiosk-id="'+stamps[i].kioskId+'">Показать точку со штампом '+arrowSvg+'</button>';
          h+='</div>';
        }
        h+='</div>';
      }
    }else{
      var sellsP=data.sellsPassports!==false;
      var isFree=data.isStampFree===true;
      h+=renderGallery(data);
      h+='<div class="vb-t1__card-badge'+(!sellsP?' vb-t1__card-badge--green':'')+'">'+(!sellsP?'ШТАМП-СТАНЦИЯ':'ТОЧКА СО ШТАМПАМИ')+'</div>';
      if(isFree)h+='<div class="vb-t1__card-tag">Бесплатный штамп</div>';
      h+='<h3 class="vb-t1__card-name">'+data.name+'</h3>';
      if(data.desc)h+='<p class="vb-t1__card-desc">'+data.desc+'</p>';
      h+='<a class="vb-t1__route-link" href="https://yandex.ru/maps/?pt='+data.coords[1]+','+data.coords[0]+'&z=16" target="_blank" rel="noopener noreferrer">Открыть в Яндекс Картах '+routeSvg+'</a>';
      if(!sellsP){h+='<div class="vb-t1__passport-info vb-t1__passport-info--muted">'+(data.passportInfo||'Здесь можно бесплатно поставить коллекционный штамп. Паспорта в этой точке не продаются.')+'</div>';}
      else{h+='<div class="vb-t1__passport-info">Здесь можно купить Паспорт туриста и поставить коллекционные штампы</div>';}
      if(data.stamps&&data.stamps.length>0){
        h+='<div class="vb-t1__stamps-wrapper">';
        h+='<div class="vb-t1__stamps-label">Доступные штампы:</div>';
        h+='<div class="vb-t1__stamps-grid" id="vbT1StampsGrid"></div>';
        h+='<div class="vb-t1__stamps-nav"></div>';
        h+='</div>';
      }
    }
    return h;
  }

  /* ═══ Navigation ═══ */
  function getVis(){
    var t=currentTab==='places'?'location':'kiosk',r=[];
    for(var i=0;i<markers.length;i++)if(markers[i].type===t&&(!vbPassportOnly||markers[i].data.sellsPassports===true))r.push(i);
    return r;
  }

  function updCounter(c,t){if(counterEl)counterEl.textContent=(c+1)+' / '+t;if(mcardCounterEl)mcardCounterEl.textContent=(c+1)+' / '+t;}

  function go(dir){
    var vis=getVis();if(!vis.length)return;
    var cv=-1;for(var i=0;i<vis.length;i++)if(vis[i]===selectedIdx){cv=i;break;}
    if(cv===-1)cv=0;
    var nv=cv+dir;if(nv<0)nv=vis.length-1;if(nv>=vis.length)nv=0;
    var ni=vis[nv],m=markers[ni];
    if(map&&m&&m.placemark)map.setCenter(m.data.coords,m.data.zoom||15,{flying:true,duration:400});
    selectMarkerByIndex(ni);
  }

  function deselectMarker(){
    if(selectedIdx>=0&&markers[selectedIdx]){
      var m=markers[selectedIdx];
      var isLoc=m.type==='location';
      var st=isStation(m.data);
      m.placemark.options.set('iconImageHref',st?stationDef:(isLoc?greenDef:terraDef));
      m.placemark.options.set('iconImageSize',[20,24]);
      m.placemark.options.set('iconImageOffset',iconOffset(m.dataId,false));
    }
    selectedIdx=-1;
    if(document.getElementById('vbT1MapContainer').ownerDocument.documentElement.clientWidth<=960){
      mcard.classList.remove('vb-t1__mcard--visible');
      mcard.classList.remove('vb-t1__mcard--expanded');
      mcardBody.classList.remove('vb-t1__mcard-body--kiosk');
      mcardBodyInner.classList.remove('vb-t1__mcard-body-inner--kiosk');
    }
  }

  /* ═══ Map reposition ═══ */
  var repositionTimer=null;

  function repositionMap(){
    if(!map||selectedIdx<0)return;
    try{
      var m=markers[selectedIdx];
      var mapRect=mapContainer.getBoundingClientRect();
      var mw=mapRect.width,mh=mapRect.height;
      var desk=document.getElementById('vbT1MapContainer').ownerDocument.documentElement.clientWidth>960;
      var zoom=map.getZoom();
      var markerPx=map.converter.coordinatesToGlobalPixels(m.data.coords,zoom);
      var centerPx=map.getGlobalPixelCenter();
      var mcx=markerPx[0]-centerPx[0]+mw/2;
      var mcy=markerPx[1]-centerPx[1]+mh/2;
      var dx,dy;
      if(desk){
        var pw=panel.classList.contains('vb-t1__panel--open')?panel.offsetWidth:0;
        dx=(mw-pw)/2-mcx;
        dy=mh/2-mcy;
      }else{
        var ch=mcard.classList.contains('vb-t1__mcard--visible')?mcard.offsetHeight:0;
        dx=mw/2-mcx;
        dy=(mh-ch)/2-mcy;
      }
      if(Math.abs(dx)<3&&Math.abs(dy)<3)return;
      var np=[centerPx[0]+dx,centerPx[1]+dy];
      var nc=map.converter.globalPixelsToCoordinates(np,zoom);
      map.setCenter(nc,zoom,{flying:true,duration:400});
    }catch(e){}
  }

  var cardModeTimer;
  function syncCardMode(){
    if(selectedIdx<0||isTransitioning)return;
    var desk=document.getElementById("vbT1MapContainer").ownerDocument.documentElement.clientWidth>960;
    var wrong=desk?mcard.classList.contains("vb-t1__mcard--visible"):panel.classList.contains("vb-t1__panel--open");
    if(!wrong)return;
    var idx=selectedIdx;
    panel.classList.remove("vb-t1__panel--open","vb-t1__panel--places");
    mcard.classList.remove("vb-t1__mcard--visible","vb-t1__mcard--expanded");
    selectedIdx=-1;selectMarkerByIndex(idx);
  }
  function scheduleCardMode(){clearTimeout(cardModeTimer);cardModeTimer=setTimeout(syncCardMode,260);}
  function scheduleReposition(){clearTimeout(repositionTimer);repositionTimer=setTimeout(repositionMap,80);}

  /* ═══ Select marker ═══ */
  function selectMarkerByIndex(idx){
    if(idx===selectedIdx||isTransitioning)return;
    deselectMarker();
    if(vbRoutes)vbRoutes.clear();
    selectedIdx=idx;
    vbYandexNotify();
    currentImageIdx=0;
    isTransitioning=true;
    var m=markers[idx];
    var isLoc=m.type==='location';
    var st=isStation(m.data);

    m.placemark.options.set('iconImageHref',st?stationSel:(isLoc?greenSel:terraSel));
    m.placemark.options.set('iconImageSize',[30,36]);
    m.placemark.options.set('iconImageOffset',iconOffset(m.dataId,true));

    var vis=getVis();
    for(var i=0;i<vis.length;i++)if(vis[i]===idx){updCounter(i,vis.length);break;}

    var desk=document.getElementById('vbT1MapContainer').ownerDocument.documentElement.clientWidth>960;
    var tgt=desk?panelBody:mcardBodyInner;

    tgt.style.opacity='0';tgt.style.transform='translateY(6px)';
    tgt.style.transition='opacity 0.2s,transform 0.2s';

    var selection=idx;
    setTimeout(function(){
      if(selectedIdx!==selection){isTransitioning=false;return;}
      tgt.innerHTML=renderContent(m.data,m.type);
      if(m.type==='kiosk'){
        renderStamps(m.data,tgt);
        if(desk){panelBody.classList.add('vb-t1__panel-body--kiosk');panel.classList.remove('vb-t1__panel--places');}
        else{mcardBody.classList.add('vb-t1__mcard-body--kiosk');mcardBodyInner.classList.add('vb-t1__mcard-body-inner--kiosk');}
        var sw=tgt.querySelector('.vb-t1__stamps-wrapper');if(sw)sw.scrollTop=0;
      }else{
        if(desk){panelBody.classList.remove('vb-t1__panel-body--kiosk');panel.classList.add('vb-t1__panel--places');}
        else{mcardBody.classList.remove('vb-t1__mcard-body--kiosk');mcardBodyInner.classList.remove('vb-t1__mcard-body-inner--kiosk');}
      }
      if(!desk){
        if(m.data.url){
          mcardName.innerHTML='<a href="'+m.data.url+'" style="color:inherit;text-decoration:none;">'+m.data.name+'</a>';
        }else{
          mcardName.textContent=m.data.name;
        }
      }

      tgt.style.opacity='1';tgt.style.transform='translateY(0)';

      if(desk&&!panel.classList.contains('vb-t1__panel--open')){
        panel.classList.add('vb-t1__panel--open');
        setTimeout(repositionMap,160);
      }else if(desk){
        repositionMap();
      }else{
        mcard.classList.add('vb-t1__mcard--visible');
        mcard.classList.remove('vb-t1__mcard--expanded');
      }
      isTransitioning=false;
    },220);
  }

  function closePanel(){
    panel.classList.remove('vb-t1__panel--open');
    panel.classList.remove('vb-t1__panel--places');
    panelBody.classList.remove('vb-t1__panel-body--kiosk');
    deselectMarker();
    setTimeout(function(){fitMap(currentTab==='places'?'location':'kiosk');},400);
  }

  function toggleMcard(){mcard.classList.toggle('vb-t1__mcard--expanded');setTimeout(repositionMap,400);}

  /* ═══ Контролы карты: изменение масштаба ═══ */
  function changeZoom(direction){
    if(!map)return;
    var zoom=map.getZoom();
    var target=Math.max(1,Math.min(21,zoom+direction));
    if(target!==zoom)map.setZoom(target,{duration:180,checkZoomRange:true});
  }

  /* ═══ Собственный разворот карты ═══ */
  var fsExpandPath='M3 7V3h4M13 7V3H9M3 9v4h4M13 9v4H9';
  var fsCollapsePath='M7 3v4H3M9 3v4h4M7 13v-4H3M9 13v-4h4';
  var oldBodyOverflow='',oldHtmlOverflow='';

  function toggleFullscreen(){
    var mapEl=document.querySelector('.vb-t1__map');
    var btn=document.getElementById('vbT1FsBtn');
    var svgPath=btn.querySelector('svg path');
    isFs=!isFs;
    if(isFs){
      oldBodyOverflow=document.body.style.overflow;
      oldHtmlOverflow=document.documentElement.style.overflow;
      document.body.style.overflow='hidden';
      document.documentElement.style.overflow='hidden';
      mapEl.classList.add('vb-t1__map--fullscreen');
    }else{
      mapEl.classList.remove('vb-t1__map--fullscreen');
      document.body.style.overflow=oldBodyOverflow;
      document.documentElement.style.overflow=oldHtmlOverflow;
    }

    var actionLabel=isFs?'Свернуть карту':'Развернуть карту';
    btn.setAttribute('aria-label',actionLabel);
    btn.setAttribute('title',actionLabel);
    btn.setAttribute('aria-pressed',String(isFs));
    svgPath.setAttribute('d',isFs?fsCollapsePath:fsExpandPath);

    // Не открываем карточку автоматически: сохраняем выбранное место.
    function refreshMapViewport(){
      if(map&&map.container)map.container.fitToViewport();
      if(selectedIdx>=0)scheduleReposition();
      scheduleCardMode();
    }
    requestAnimationFrame(function(){
      refreshMapViewport();
      setTimeout(refreshMapViewport,120);
    });
  }

  /* ═══ Fit map ═══ */
  function fitMap(type){
    var coords=[];
    for(var i=0;i<markers.length;i++)if(markers[i].type===type&&(!vbPassportOnly||markers[i].data.sellsPassports===true))coords.push(markers[i].placemark.geometry.getCoordinates());
    if(!coords.length)return;
    if(coords.length===1){map.setCenter(coords[0],markers[0].data.zoom||15,{duration:400});return;}
    var s=coords[0][0],n=coords[0][0],w=coords[0][1],e=coords[0][1];
    for(var i=1;i<coords.length;i++){
      if(coords[i][0]<s)s=coords[i][0];if(coords[i][0]>n)n=coords[i][0];
      if(coords[i][1]<w)w=coords[i][1];if(coords[i][1]>e)e=coords[i][1];
    }
    map.setBounds([[s,w],[n,e]],{checkZoomRange:true,zoomMargin:type==='location'?24:60,duration:400});
  }

  /* ═══ Tab switch ═══ */
  function switchTab(name,fit,autoSel){
    vbPassportOnly=false;
    if(vbRoutes){vbRoutes.clear();vbRoutes.setView(name==='places'?'places':'stamps');}
    currentTab=name;
    var activeType=name==='places'?'location':'kiosk';
    for(var i=0;i<tabBtns.length;i++){
      var act=tabBtns[i].getAttribute('data-tab')===name;
      tabBtns[i].classList.toggle('vb-t1__tab--active',act);
      tabBtns[i].setAttribute('aria-selected',act?'true':'false');
    }
    for(var i=0;i<markers.length;i++)markers[i].placemark.options.set('visible',markers[i].type===activeType);
    deselectMarker();
    if(fit!==false)fitMap(activeType);
    var vis=getVis();
    if(autoSel!==false&&vis.length>0)selectMarkerByIndex(vis[0]);
    vbYandexNotify();
  }

  /* ═══ Navigate to specific points ═══ */
  function navToKiosk(kid){
    switchTab('stamps',false,false);
    var sp=findSp(kid);if(!sp)return;
    map.setCenter(sp.coords,sp.zoom||16,{duration:400});
    for(var i=0;i<markers.length;i++){if(markers[i].type==='kiosk'&&markers[i].dataId===kid){selectMarkerByIndex(i);return;}}
  }

  function navToLoc(lid){
    switchTab('places',false,false);
    var loc=findLoc(lid);if(!loc)return;
    if(loc.bounds){var b=loc.bounds;map.setBounds([[b[1],b[0]],[b[3],b[2]]],{checkZoomRange:true,zoomMargin:innerWidth<=640?[35,30,180,30]:[40,350,40,40],duration:400});}else map.setCenter(loc.coords,loc.zoom||15,{duration:400});
    for(var i=0;i<markers.length;i++){if(markers[i].type==='location'&&markers[i].dataId===lid){selectMarkerByIndex(i);return;}}
  }

  /* ═══ Hash ═══ */
  function scrollToBlock(){var s=document.querySelector('.vb-t1');if(s)s.scrollIntoView({behavior:'smooth',block:'start'});}
  function handleHash(){var h=window.location.hash;if(h==='#map'){switchTab('places');scrollToBlock();}else if(h==='#map-stamps'){switchTab('stamps');scrollToBlock();}}

  /* ═══ Create map ═══ */
  function createMap(){
    // Встроенные zoomControl/fullscreenControl отключены: все три кнопки слева свои.
    map=new ymaps.Map(mapContainer,{center:[54.0,58.35],zoom:11,controls:[],behaviors:['default','scrollZoom']});

    for(var i=0;i<locations.length;i++){(function(j){
      var l=locations[j];
      var pm=new ymaps.Placemark(l.coords,{},{
        iconLayout:'default#image',iconImageHref:greenDef,iconImageSize:[20,24],iconImageOffset:[-10,-24]
      });
      map.geoObjects.add(pm);
      markers.push({placemark:pm,type:'location',dataId:l.id,data:l});
    })(i);}

    for(var i=0;i<stampPoints.length;i++){(function(j){
      var sp=stampPoints[j];
      var st=isStation(sp);
      var pm=new ymaps.Placemark(sp.coords,{},{
        iconLayout:'default#image',iconImageHref:st?stationDef:terraDef,iconImageSize:[20,24],iconImageOffset:iconOffset(sp.id,false)
      });
      map.geoObjects.add(pm);
      markers.push({placemark:pm,type:'kiosk',dataId:sp.id,data:sp});
    })(i);}

    for(var i=0;i<markers.length;i++){(function(j){markers[j].placemark.events.add('click',function(){selectMarkerByIndex(j);});})(i);}

    vbRoutes=createYandexRoutes(ymaps,map,config,function(id){window.VisitBeloretskYandex.openRoute(id).catch(function(){window.dispatchEvent(new CustomEvent('vb-yandex-routes-error'));});},function(){window.dispatchEvent(new CustomEvent('vb-yandex-routes-error'));});
    if(window.location.hash==='#map-stamps'){switchTab('stamps',true,true);}
    else{map.setBounds([[53.75,58.25],[54.07,58.72]],{checkZoomRange:true,zoomMargin:45});}

    if(typeof ResizeObserver!=='undefined')new ResizeObserver(function(){scheduleCardMode();if(map&&map.container)map.container.fitToViewport();if(selectedIdx>=0)scheduleReposition();}).observe(mapContainer);
    mapLoader.classList.add('vb-t1__map-loader--hidden');
    window.dispatchEvent(new Event('vb-yandex-ready'));
  }

  function initMap(){
    if(window.ymaps){ymaps=window.ymaps;ymaps.ready(createMap);return;}
    var s=document.createElement('script');s.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU'+(config.yandexApiKey?'&apikey='+encodeURIComponent(config.yandexApiKey):'');s.async=true;
    s.onload=function(){ymaps=window.ymaps;ymaps.ready(createMap);};
    s.onerror=function(){mapLoader.textContent='Не удалось загрузить обычную карту. Попробуйте 3D-карту.';};
    document.head.appendChild(s);
  }

  /* ═══ Event listeners ═══ */
  for(var f=0;f<tabBtns.length;f++){(function(btn){btn.addEventListener('click',function(){var t=btn.getAttribute('data-tab');switchTab(t);var h=t==='places'?'#map':'#map-stamps';if(window.location.hash!==h)history.replaceState(null,'',h);});})(tabBtns[f]);}
  window.addEventListener('hashchange',handleHash);
  window.addEventListener('resize',function(){
    scheduleCardMode();
    if(selectedIdx>=0)scheduleReposition();
    if(map&&map.container)map.container.fitToViewport();
  });

  document.getElementById('vbT1Prev').addEventListener('click',function(){go(-1);});
  document.getElementById('vbT1Next').addEventListener('click',function(){go(1);});
  document.getElementById('vbT1PanelClose').addEventListener('click',closePanel);
  document.getElementById('vbT1McardPrev').addEventListener('click',function(){go(-1);});
  document.getElementById('vbT1McardNext').addEventListener('click',function(){go(1);});
  document.getElementById('vbT1McardToggle').addEventListener('click',toggleMcard);
  document.getElementById('vbT1ZoomIn').addEventListener('click',function(){changeZoom(1);});
  document.getElementById('vbT1ZoomOut').addEventListener('click',function(){changeZoom(-1);});
  document.getElementById('vbT1FsBtn').addEventListener('click',toggleFullscreen);

  function setupClickHandler(el){
    el.addEventListener('click',function(e){
      var gb=e.target.closest('.vb-t1__gallery-btn');if(gb){changePhoto(parseInt(gb.getAttribute('data-dir'),10));return;}
      var sb=e.target.closest('.vb-t1__stamp-btn');if(sb){navToKiosk(sb.getAttribute('data-kiosk-id'));return;}
      var pl=e.target.closest('.vb-t1__stamps-pill');if(pl&&pl.hasAttribute('data-location-id')){navToLoc(pl.getAttribute('data-location-id'));return;}
    });
  }
  setupClickHandler(panelBody);
  setupClickHandler(mcardBodyInner);

  document.getElementById('vbT1ModalClose').addEventListener('click',closeModal);
  document.getElementById('vbT1Modal').addEventListener('click',function(e){if(e.target===this)closeModal();});
  document.getElementById('vbT1ModalBody').addEventListener('click',function(e){var s=e.target.closest('.vb-t1__modal-stamp');if(s&&s.hasAttribute('data-location-id')){closeModal();navToLoc(s.getAttribute('data-location-id'));}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(isFs){toggleFullscreen();return;}closeModal();}});

  /* @YandexAdapter */
  initMap();
  if(window.location.hash==='#map'||window.location.hash==='#map-stamps')setTimeout(scrollToBlock,150);
}
