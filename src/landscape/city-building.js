function nearestEdge(ring,point){
 let nearest=null;
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<.2)continue;
  const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(length*length)));
  const distance=Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy);
  if(!nearest||distance<nearest.distance)nearest={a,b,length,distance};
 }
 return nearest;
}

export function cityBuildingParts(plan){
 const toward=plan.facadeToward&&plan.frame.toLocal(plan.facadeToward);
 return (plan.buildings||[]).map(({ring,center,osmWay})=>{
  const rings=[ring.map(plan.frame.toLocal)];
  const front=toward&&nearestEdge(rings[0],toward);
  return {osmWay,center,rings,front:front?.length>=6?front:null};
 });
}
