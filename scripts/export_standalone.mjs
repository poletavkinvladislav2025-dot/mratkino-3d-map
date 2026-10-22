/** Build a genuinely live, self-contained HTML demo, with no API keys or network requests. */
import fs from 'node:fs';
import path from 'node:path';
import { transformWithEsbuild } from 'vite';
const root=process.cwd();const dir=path.join(root,'public/live');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
const layers={};for(const name of ['trails','lifts','stations','forest','roads','facilities','contours'])layers[name]=JSON.parse(fs.readFileSync(path.join(dir,`${name}.geojson`)));
const tiles={};for(const tile of manifest.tiles)tiles[tile.replace(/^dem\//,'')]=fs.readFileSync(path.join(dir,tile)).toString('base64');
const workerSource=fs.readFileSync('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs','utf8');
const worker=await transformWithEsbuild(workerSource,'maplibre-worker.mjs',{format:'iife',target:'es2020',legalComments:'inline'});
const embedded={manifest,layers,tiles,licenses:{maplibre:fs.readFileSync('public/live/licenses/MAPLIBRE-BSD-3.txt','utf8'),data:fs.readFileSync('public/live/licenses/DATA.txt','utf8')},worker:worker.code,worker_format:'classic',fallback:'data:image/webp;base64,'+fs.readFileSync(path.join(dir,'fallback.webp')).toString('base64')};
const escapeScript=text=>text.replace(/<\/script/gi,'<\\/script');
const bundle=escapeScript(fs.readFileSync('build-embed/mratkino.js','utf8'));
const component=`<mratkino-map><script type="application/json">${escapeScript(JSON.stringify(embedded))}</script></mratkino-map><script>${bundle}</script>`;
fs.mkdirSync('deliverables',{recursive:true});
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Мраткино · интерактивная 3D-карта</title><style>body{margin:0;padding:12px;background:#f6f8f2}@media(max-width:760px){body{padding:5px}}</style></head><body>${component}</body></html>`;
fs.writeFileSync('deliverables/mratkino-3d.html',html);
fs.writeFileSync('deliverables/tilda-self-contained.txt','<!-- Самодостаточная WebGL-карта: код большой, предпочтительно использовать iframe и отдельный HTTPS-хостинг. -->\n'+component);
fs.writeFileSync('deliverables/tilda-iframe.txt',`<!-- Замените адрес на HTTPS-адрес размещённой карты. Это не действующий адрес. -->
<style>.mratkino-iframe{display:block;width:100%;height:880px;border:0;border-radius:16px}@media(max-width:760px){.mratkino-iframe{height:980px}}</style>
<iframe class="mratkino-iframe" src="https://YOUR-MAP-HOST/" title="Мраткино — интерактивная 3D-карта" loading="lazy" allow="fullscreen" allowfullscreen></iframe>\n`);
console.log('Standalone WebGL HTML:',Math.round(Buffer.byteLength(html)/1024/1024*10)/10,'MB; includes actual DEM tiles, OSM layers, engine and worker.');
