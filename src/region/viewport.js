export const VIEW_AREAS={
 mratkino:[58.405,53.975,58.47,54.02],
 abzakovo:[58.5920622,53.7779401,58.6527638,53.8138787],
 malinovaya:[58.2915064,53.9814381,58.3464054,54.0468411],
 yalangas:[58.2633002,54.0529335,58.3251192,54.1277957]
};
export function intersects(bounds,area){return bounds.getWest()<=area[2]&&bounds.getEast()>=area[0]&&bounds.getSouth()<=area[3]&&bounds.getNorth()>=area[1];}
export function visibleAreas(map){return map.getZoom()<11.5?[]:Object.entries(VIEW_AREAS).filter(([,area])=>intersects(map.getBounds(),area)).map(([id])=>id);}
