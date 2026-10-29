/** Display-only lanes. Source coordinates and route distances remain untouched.
 * Resample along existing segments, find nearby parallel segments in a metric grid,
 * and give distinct route IDs separate pixel lanes. Crossing paths do not fan out.
 */
export function parallelRoutes(inputs,{tolerance=5,step=20,gap=5}={}){
 const sx=111320*Math.cos(54*Math.PI/180),sy=111320,cell=40,grid=new Map(),segments=[],groups=[];
 const xy=p=>[p[0]*sx,p[1]*sy];
 const bucket=(a,b)=>{const keys=[];for(let x=Math.floor((Math.min(a[0],b[0])-tolerance)/cell);x<=Math.floor((Math.max(a[0],b[0])+tolerance)/cell);x++)for(let y=Math.floor((Math.min(a[1],b[1])-tolerance)/cell);y<=Math.floor((Math.max(a[1],b[1])+tolerance)/cell);y++)keys.push(x+','+y);return keys;};
 for(const input of inputs)for(const feature of input.data.features){
  if(!['LineString','MultiLineString'].includes(feature.geometry.type))continue;
  const key=input.id+'/'+(input.perFeature?feature.properties.id:''),lines=feature.geometry.type==='LineString'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  for(const line of lines){const group={input,feature,segments:[]};groups.push(group);
   for(let n=1;n<line.length;n++){const start=line[n-1],end=line[n],a0=xy(start),b0=xy(end),parts=Math.max(1,Math.ceil(Math.hypot(b0[0]-a0[0],b0[1]-a0[1])/step));
    for(let part=0;part<parts;part++){const interpolate=t=>start.map((v,i)=>Number((v+(end[i]-v)*t).toFixed(7))),from=part?interpolate(part/parts):start,to=part===parts-1?end:interpolate((part+1)/parts),a=xy(from),b=xy(to),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.01)continue;
     const s={key,from,to,a,b,parent:n,dx:dx/length,dy:dy/length,index:segments.length};segments.push(s);group.segments.push(s);
     for(const k of bucket(a,b)){if(!grid.has(k))grid.set(k,[]);grid.get(k).push(s);}
    }
   }
  }
 }
 const outputs=Object.fromEntries(inputs.map(i=>[i.id,{type:'FeatureCollection',features:[]}])) ;
 for(const group of groups){let current=null,lastParent=null;
  for(const s of group.segments){const mid=[(s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2],peers=new Map([[s.key,s]]);
   for(const other of grid.get(Math.floor(mid[0]/cell)+','+Math.floor(mid[1]/cell))||[]){if(Math.abs(s.dx*other.dx+s.dy*other.dy)<.97)continue;
    const vx=other.b[0]-other.a[0],vy=other.b[1]-other.a[1],t=((mid[0]-other.a[0])*vx+(mid[1]-other.a[1])*vy)/(vx*vx+vy*vy);
    if(t<0||t>1||Math.hypot(mid[0]-other.a[0]-t*vx,mid[1]-other.a[1]-t*vy)>tolerance)continue;
    if(!peers.has(other.key)||peers.get(other.key).index>other.index)peers.set(other.key,other);
   }
   const ids=[...peers.keys()].sort(),reference=peers.get(ids[0]),direction=s.dx*reference.dx+s.dy*reference.dy<0?-1:1,offset=(ids.indexOf(s.key)-(ids.length-1)/2)*gap*direction;
   if(!current||current.properties.renderOffset!==offset||current.properties.overlapCount!==ids.length){current={type:'Feature',properties:{id:group.feature.properties.id,routeId:group.feature.properties.routeId,segmentId:group.feature.properties.segmentId,renderOffset:offset,overlapCount:ids.length},geometry:{type:'LineString',coordinates:[s.from,s.to]}};outputs[group.input.id].features.push(current);}else if(lastParent===s.parent)current.geometry.coordinates[current.geometry.coordinates.length-1]=s.to;else current.geometry.coordinates.push(s.to);lastParent=s.parent;
  }
 }
 return outputs;
}
