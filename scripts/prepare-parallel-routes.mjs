import fs from 'node:fs';
import {parallelRoutes} from '../src/parallel-routes.js';
const paths={gut:'region/long-distance/gut.geojson',yt:'region/long-distance/yt.geojson',malinovaya:'region/hiking/malinovaya/routes.geojson',yalangas:'region/hiking/yalangas/routes.geojson',directions:'region/directions/routes.geojson'};
const inputs=Object.entries(paths).map(([id,path])=>({id,perFeature:['directions'].includes(id),data:JSON.parse(fs.readFileSync('public/'+path))}));
const outputs=parallelRoutes(inputs.filter(x=>!['malinovaya','yalangas'].includes(x.id)));for(const input of inputs.filter(x=>['malinovaya','yalangas'].includes(x.id)))outputs[input.id]=JSON.parse(fs.readFileSync('public/'+paths[input.id].replace('.geojson','-display.geojson')));
for(const [id,path] of Object.entries(paths))fs.writeFileSync('public/'+path.replace('.geojson','-display.geojson'),JSON.stringify(outputs[id])+'\n');
console.log('Parallel route display:',Object.entries(outputs).map(([id,d])=>`${id}: ${d.features.length} sections`).join(', '));
