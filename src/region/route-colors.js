export const HIKING_COLORS={'malinovaya/first-return':'#126b70','malinovaya/third':'#8853a6','malinovaya/three-peaks':'#cc6b20','malinovaya/three-peaks-return':'#3369b3','yalangas/a1':'#126b70','yalangas/a2':'#8853a6'};
export const hikingColorExpression=['match',['get','canonicalId'],...Object.entries(HIKING_COLORS).flat(),'#42765c'];
