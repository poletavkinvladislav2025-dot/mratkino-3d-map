import data from './site-pages.json' with {type:'json'};
import {CITY,distanceKm} from './presets.js';
/** Site page of a place: canonical id first, then the owner's legacy id. */
export function sitePage(place){const path=data.pages[place?.id]||data.pages[place?.sourceRecord?.sourceId];return path?data.origin+path:'';}
/** Resorts outside the Beloretsk district: kept for visitors arriving from them, shown as secondary. */
export const isNeighbor=place=>data.neighbors.includes(place?.id);
export const kmFromCity=place=>Math.round(distanceKm(place.coordinates,CITY.coordinates)/5)*5;
