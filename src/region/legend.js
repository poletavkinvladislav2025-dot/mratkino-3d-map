export function visibleLegendKinds(map){
 const layers=['trail-line','abzakovo-trail-line','winter-catalog-line','hiking-route-line','kraka-but-line','long-distance-gut-line','long-distance-yt-line'].filter(id=>map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!=='none');
 if(!layers.length)return [];
 const found=new Set();
 for(const f of map.queryRenderedFeatures([[0,0],[map.getContainer().clientWidth,map.getContainer().clientHeight]],{layers})){
  const id=f.layer?.id;if(id==='long-distance-gut-line'){found.add('long-distance:gut');continue;}if(id==='long-distance-yt-line'){found.add('long-distance:yt');continue;}if(id==='hiking-route-line'||id==='kraka-but-line')found.add('hiking');
  else if(id==='winter-catalog-line'){if(f.properties.category==='ski')found.add('ski');if(f.properties.category==='nordic')found.add('nordic');}
  else found.add('ski');
 }
 return [...found].sort();
}
