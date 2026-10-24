/** Keep MapLibre's continuous wheel gesture, with gentler mouse and trackpad rates. */
export const CAMERA_CONTROL={wheelRate:1/1000,trackpadRate:1/180,settleMs:140};
export function configureCameraControl(map){
 map.scrollZoom.setWheelZoomRate(CAMERA_CONTROL.wheelRate);
 map.scrollZoom.setZoomRate(CAMERA_CONTROL.trackpadRate);
 // Native handlers already cancel camera flights with stop(true), preserving gestures.
}
export function cameraLayoutKey(map){
 const c=map.getCenter(),size=map.getContainer();
 return [c.lng,c.lat,map.getZoom(),map.getPitch(),map.getBearing(),size.clientWidth,size.clientHeight].join(':');
}
export const sameInputs=(a,b)=>!!a&&a.length===b.length&&a.every((v,i)=>v===b[i]);
