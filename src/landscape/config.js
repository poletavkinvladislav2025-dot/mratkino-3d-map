/** All distances in metres unless noted. Central tuning, not botanical/survey claims. */
export const LANDSCAPE={
 tileZoom:14,enterZoom:13.1,exitZoom:12.7,treeSpacing:32,
 desktop:{cells:9,cacheCells:18,trees:12000,radius:1600,memoryMB:24},
 mobile:{cells:4,cacheCells:8,trees:3600,radius:850,memoryMB:10},
 roads:{motorway:11,trunk:10,primary:8,secondary:6,tertiary:5,minor:4,service:3,path:1.3,track:2},
 pisteClearance:12,liftClearance:13,waterClearance:3,
 provider:'https://tiles.openfreemap.org/planet',maxTileBytes:3*1024*1024,
};
export const LINE_LOD={enter:10.4,exit:10.0,prefetchFraction:.18,labels:13.4,models:13.4};
