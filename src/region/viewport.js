import {LINE_LOD} from '../landscape/config.js';
export const VIEW_AREAS={
 mratkino:[58.405,53.975,58.47,54.02],
 abzakovo:[58.5920622,53.7779401,58.6527638,53.8138787],
 malinovaya:[58.2915064,53.9814381,58.3464054,54.0468411],
 yalangas:[58.2633002,54.0529335,58.3251192,54.1277957]
};
export function intersects(bounds,area){return bounds.getWest()<=area[2]&&bounds.getEast()>=area[0]&&bounds.getSouth()<=area[3]&&bounds.getNorth()>=area[1];}
export function visibleAreas(map,previous=[]){const zoom=map.getZoom();const b=map.getBounds(),dx=(b.getEast()-b.getWest())*LINE_LOD.prefetchFraction,dy=(b.getNorth()-b.getSouth())*LINE_LOD.prefetchFraction,buffered={getWest:()=>b.getWest()-dx,getEast:()=>b.getEast()+dx,getSouth:()=>b.getSouth()-dy,getNorth:()=>b.getNorth()+dy};return Object.entries(VIEW_AREAS).filter(([id,area])=>zoom>=(previous.includes(id)?LINE_LOD.exit:LINE_LOD.enter)&&intersects(buffered,area)).map(([id])=>id);}
