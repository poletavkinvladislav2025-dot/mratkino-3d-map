// Route identifiers, deliberately separate from the unverified OSM difficulty tags.
export const SKI_COLORS={'1':'#145dd9','2':'#00859b','3':'#7944d3','4':'#d52c3b','5':'#b85a00','7':'#bd238d','8':'#087f52','9':'#384cb0','10':'#b43d24','11':'#007269','12':'#7c37a1','13':'#263a46'};
export const skiColor=number=>SKI_COLORS[number]||'#58656d';
export const skiColorExpression=()=>['match',['get','number'],...Object.entries(SKI_COLORS).flat(),'#58656d'];
