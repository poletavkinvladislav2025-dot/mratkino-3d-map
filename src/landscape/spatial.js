export const WORLD=40075016.68557849;
export const project=([lng,lat])=>[(lng+180)/360*WORLD,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*WORLD];
export const unproject=([x,y])=>[x/WORLD*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y/WORLD)))*180/Math.PI];
export function hash(x,y){let a=Math.imul(x^0x9e3779b9,0x85ebca6b)^Math.imul(y^0x7f4a7c15,0xc2b2ae35);a=Math.imul(a^(a>>>16),0x85ebca6b);return (a^(a>>>13))>>>0;}
export function ringContains(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function inside(p,g){if(g.type==='Polygon')return ringContains(p,g.coordinates[0])&&!g.coordinates.slice(1).some(r=>ringContains(p,r));if(g.type==='MultiPolygon')return g.coordinates.some(c=>inside(p,{type:'Polygon',coordinates:c}));return false;}
export function lineDistance(p,line){let min=Infinity;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;min=Math.min(min,Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t));}return min;}
export function near(p,g,width){if(inside(p,g))return true;const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'||g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():[];return lines.some(l=>lineDistance(p,l)<width);}
export function mapGeometry(g,fn){const walk=c=>typeof c[0]==='number'?fn(c):c.map(walk);return {...g,coordinates:walk(g.coordinates)};}
export function geometryBounds(g){const points=[];const walk=c=>typeof c[0]==='number'?points.push(c):c.forEach(walk);walk(g.coordinates);return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];}
export const inBox=(p,b,pad=0)=>p[0]>=b[0]-pad&&p[0]<=b[2]+pad&&p[1]>=b[1]-pad&&p[1]<=b[3]+pad;
/** Best-first nearest cells: work is bounded by the requested budget, even at the horizon. */
export function tileCells(center,bounds,z,limit){
 if(!Number.isInteger(limit)||limit<1||limit>64||!Number.isInteger(z)||z<0||z>22||![...center,...bounds.flat()].every(Number.isFinite))return [];
 const n=2**z,size=WORLD/n,clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),safe=p=>project([clamp(p[0],-180,180),clamp(p[1],-85.05112878,85.05112878)]),c=safe(center),[[w,s],[e,north]]=bounds,a=safe([w,north]),b=safe([e,s]);
 const x0=clamp(Math.floor(a[0]/size)-1,0,n-1),x1=clamp(Math.floor(b[0]/size)+1,0,n-1),y0=clamp(Math.floor(a[1]/size)-1,0,n-1),y1=clamp(Math.floor(b[1]/size)+1,0,n-1);
 if(x0>x1||y0>y1)return [];
 const queue=[],seen=new Set(),cells=[],push=(x,y)=>{if(x<x0||x>x1||y<y0||y>y1)return;const id=`${z}/${x}/${y}`;if(seen.has(id))return;seen.add(id);queue.push({x,y,z,id,distance:Math.hypot((x+.5)*size-c[0],(y+.5)*size-c[1])});};
 push(clamp(Math.floor(c[0]/size),x0,x1),clamp(Math.floor(c[1]/size),y0,y1));
 while(queue.length&&cells.length<limit){queue.sort((a,b)=>a.distance-b.distance||a.x-b.x||a.y-b.y);const cell=queue.shift();cells.push(cell);push(cell.x-1,cell.y);push(cell.x+1,cell.y);push(cell.x,cell.y-1);push(cell.x,cell.y+1);}
 return cells;
}
