import {distanceKm} from './presets.js';
export function natureTiles(index,center,bounds,zoom,mobile=false){
 if(zoom<14.2)return [];
 const [[w,s],[e,n]]=bounds;
 return index.tiles.filter(t=>t.bounds[0]<=e&&t.bounds[2]>=w&&t.bounds[1]<=n&&t.bounds[3]>=s)
  .map(t=>({tile:t,distance:distanceKm(center,[(t.bounds[0]+t.bounds[2])/2,(t.bounds[1]+t.bounds[3])/2])}))
  .filter(t=>t.distance<1.05).sort((a,b)=>a.distance-b.distance).slice(0,mobile?2:4).map(t=>t.tile);
}
export const natureTreeBudget=mobile=>mobile?700:2400;
