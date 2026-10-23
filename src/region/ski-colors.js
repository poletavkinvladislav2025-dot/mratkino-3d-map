import {catalog,CATEGORIES,classification} from './piste-catalog.js';
export const SKI_COLORS=Object.fromEntries(Object.entries(catalog.abzakovo.categories).map(([number,category])=>[number,CATEGORIES[category].color]));
export const skiColor=number=>classification('abzakovo',{number}).color;
export const skiColorExpression=()=>['coalesce',['get','displayColor'],CATEGORIES.unknown.color];
