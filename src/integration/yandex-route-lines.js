/** Shift display pixels only; geographic route assets stay unchanged. */
export function offsetRoutePixels(points,offset){
 if(!offset||points.length<2)return points;
 const normals=[];for(let i=1;i<points.length;i++){const dx=points[i][0]-points[i-1][0],dy=points[i][1]-points[i-1][1],length=Math.hypot(dx,dy)||1;normals.push([-dy/length,dx/length]);}
 return points.map((p,i)=>{const a=normals[Math.max(0,i-1)],b=normals[Math.min(i,normals.length-1)],nx=a[0]+b[0],ny=a[1]+b[1],length=Math.hypot(nx,ny);if(length<.1)return [p[0]+b[0]*offset,p[1]+b[1]*offset];const x=nx/length,y=ny/length,scale=offset/Math.max(.35,x*b[0]+y*b[1]);return [p[0]+x*scale,p[1]+y*scale];});
}
