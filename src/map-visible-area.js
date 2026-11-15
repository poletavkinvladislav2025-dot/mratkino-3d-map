/** Pixel coordinates relative to the map canvas, excluding its open place card. */
export function visibleMapArea(map,card=null,dock='right'){
 const w=Math.max(1,map.width),h=Math.max(1,map.height);
 const right=card&&card.width>0&&card.height>0&&dock==='right'?Math.max(Math.min(44,w),Math.min(w,card.left-map.left)):w;
 const bottom=card&&card.width>0&&card.height>0&&dock==='bottom'?Math.max(Math.min(44,h),Math.min(h,card.top-map.top)):h;
 return {x:right/2,y:bottom/2,padding:{left:0,top:0,right:w-right,bottom:h-bottom}};
}
