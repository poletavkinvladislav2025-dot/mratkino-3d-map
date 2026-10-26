import {localFrame} from '../resort-scene-data.js';
export const RODEO={center:[59.3676826,54.3148438],lift:[[59.368029,54.3145328],[59.3644184,54.311886]],source:'https://www.openstreetmap.org/way/441222152',width:86,enter:14.2,exit:13.8,radiusKm:.9};
export const rodeoFrame=localFrame(RODEO.center);
/** Illustration parallel to the mapped lift, not a surveyed piste boundary. */
export function rodeoPlan(height=()=>0){
 let [a,b]=RODEO.lift.map(rodeoFrame.toLocal);const reversed=height(...a)<height(...b);if(reversed)[a,b]=[b,a];
 const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),forward=[dx/length,dy/length],side=[-forward[1],forward[0]],offset=reversed?-52:52;
 const point=(x,d)=>[a[0]+forward[0]*d+side[0]*(offset+x),a[1]+forward[1]*d+side[1]*(offset+x)];
 const zone=[point(-43,0),point(43,0),point(43,length),point(-43,length),point(-43,0)];
 return {a,b,length,forward,side,point,zone,angle:Math.atan2(forward[1],forward[0])-Math.PI/2,bag:{x:-26,d:length*.8,width:20,length:16,height:3},lanes:[-26,-15,-4,7,18,29]};
}
export function freestylePose(plan,index,time,count=96){
 const lane=index%6,cycle=28+(index%5)*2,phase=((time/cycle+(Math.floor(index/6)+.35)/(count/6))%1+1)%1,d=phase*plan.length;
 const jump=lane===0?plan.bag.d-22:plan.length*(lane%2?.43:.6),airLength=lane===0?22:18,t=(d-jump)/airLength,airborne=t>0&&t<1;
 const lateral=plan.lanes[lane]+Math.sin(phase*Math.PI*10+index)*3.3;
 const rail=plan.length*.23+lane%2*13,dist=Math.min(Math.max(jump-9-d,0,d-jump-airLength-10),lane>0?Math.max(0,Math.abs(d-rail)-10):Infinity),lock=1-Math.min(1,dist/8);const p=plan.point(plan.lanes[lane]+(lateral-plan.lanes[lane])*(1-lock),d);
 const jumpHeight=airborne?Math.sin(Math.PI*t)*(lane===0?7:4):0;
 return {x:p[0],y:p[1],d,lane,board:(index+Math.floor(index/6))%2===0,airborne,jumpHeight,jump,airLength,rail,spin:airborne?t*Math.PI*2*(index%3===0?2:1):0,flip:airborne&&index%4===0?t*Math.PI*2:0,heading:plan.angle-Math.atan(Math.cos(phase*Math.PI*10+index)*3.3*10*Math.PI/plan.length)*(1-lock),lean:airborne?0:Math.sin(phase*Math.PI*10+index)*.2,fade:Math.min(1,phase*25,(1-phase)*25)};
}
export const rodeoMask=()=>({type:'Polygon',coordinates:[rodeoPlan().zone.map(rodeoFrame.toLngLat)]});

export function sampledRodeoGround(plan,sample,step=6){
 const nx=18,ny=Math.ceil(plan.length/step),dx=100/nx,dy=plan.length/ny,grid=Array.from({length:ny+1},(_,j)=>Array.from({length:nx+1},(_,i)=>sample(...plan.point(-50+i*dx,j*dy))));
 const origin=plan.point(0,0);return (x,y)=>{const vx=x-origin[0],vy=y-origin[1],u=Math.max(0,Math.min(nx-.000001,(vx*plan.side[0]+vy*plan.side[1]+50)/dx)),v=Math.max(0,Math.min(ny-.000001,(vx*plan.forward[0]+vy*plan.forward[1])/dy)),i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j;return (grid[j][i]*(1-a)+grid[j][i+1]*a)*(1-b)+(grid[j+1][i]*(1-a)+grid[j+1][i+1]*a)*b;};
}
export function freestyleAltitude(plan,state,height){
 const support=d=>{if(state.lane!==0)return 0;const delta=d-plan.bag.d;if(Math.abs(delta)<8)return Math.max(1.8,1.4+2.8*Math.sqrt(Math.max(0,1-(delta/8)**2)));return delta>=8&&delta<14?1.8*(14-delta)/6:0;};
 if(state.airborne){const t=(state.d-state.jump)/state.airLength,a=plan.point(plan.lanes[state.lane],state.jump),b=plan.point(plan.lanes[state.lane],state.jump+state.airLength);return (height(...a)+(state.lane===0?3.1:2.2))*(1-t)+(height(...b)+support(state.jump+state.airLength))*t+state.jumpHeight;}
 const approach=(state.d-state.jump+8)/8;if(approach>=0&&approach<=1)return height(state.x,state.y)+approach*(state.lane===0?3.1:2.2);
 const rail=state.lane>0?Math.max(0,Math.min(1,(10-Math.abs(state.d-state.rail))/4))*(state.lane%2?.9:1.15):0;
 return height(state.x,state.y)+Math.max(support(state.d),rail);
}
