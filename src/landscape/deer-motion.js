import {ethnopark as config} from './ethnopark-settings.js';
import {hash} from './spatial.js';
export function validDeerPosition(x,y,c=config){const margin=c.deer.bodyRadius+.7;return Math.abs(x)<c.pen.width/2-margin&&Math.abs(y)<c.pen.depth/2-margin&&Math.hypot(x-c.chum.x,y-c.chum.y)>c.chum.radius+c.deer.bodyRadius+1.2;}
export function makeHerd(c=config){const herd=[];for(let i=0;i<c.deer.count;i++){let k=0,x,y;do{const s=hash(i+78,++k);x=((s%10000)/10000-.5)*(c.pen.width-8);y=(((s>>>14)%10000)/10000-.5)*(c.pen.depth-8);}while((!validDeerPosition(x,y,c)||herd.some(a=>Math.hypot(a.x-x,a.y-y)<c.deer.separation))&&k<1000);herd.push({id:i,x,y,heading:i*2.399,phase:i*1.73,clock:0,mode:i%3?'walk':'rest',until:2+i*.37,seed:hash(i,987),goal:[x,y]});}return herd;}
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
export function advanceHerd(herd,dt,c=config){dt=Math.min(.15,Math.max(0,dt));if(!dt)return herd;
 for(const a of herd){a.clock+=dt;a.until-=dt;
  if(a.until<=0){a.seed=hash(a.seed,a.id+13);a.mode=['walk','graze','walk','rest'][a.seed%4];a.until=3+(a.seed%90)/10;let k=0;do{const s=hash(a.seed,++k);a.goal=[((s%10000)/10000-.5)*(c.pen.width-8),(((s>>>14)%10000)/10000-.5)*(c.pen.depth-8)];}while(!validDeerPosition(...a.goal,c)&&k<100);}
  a.moving=false;if(a.mode!=='walk')continue;
  let dx=a.goal[0]-a.x,dy=a.goal[1]-a.y;if(Math.hypot(dx,dy)<1.5){a.until=0;continue;}
  for(const b of herd)if(a!==b){const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<5){dx+=(a.x-b.x)*4/Math.max(d*d,.1);dy+=(a.y-b.y)*4/Math.max(d*d,.1);}}
  a.heading+=Math.max(-dt*1.4,Math.min(dt*1.4,angle(Math.atan2(dy,dx)-a.heading)));
  const speed=.3+(a.id%7)/6*(c.deer.maxSpeed-.3),x=a.x+Math.cos(a.heading)*speed*dt,y=a.y+Math.sin(a.heading)*speed*dt;
  if(validDeerPosition(x,y,c)&&herd.every(b=>a===b||Math.hypot(x-b.x,y-b.y)>=c.deer.separation)){a.x=x;a.y=y;a.phase+=dt*speed*4.5;a.moving=true;}else a.until=0;
 }
 return herd;
}
