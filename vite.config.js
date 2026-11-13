import { defineConfig } from 'vite';
import { rm } from 'node:fs/promises';
export default defineConfig({
 base:'./',
 build:{rollupOptions:{input:{main:'index.html',osm:'osm-test.html'}}},
 optimizeDeps:{include:['maplibre-gl','three','three/addons/utils/BufferGeometryUtils.js']},
 plugins:[{name:'omit-legacy-static-assets',apply:'build',async closeBundle(){await Promise.all(['dist/data','dist/renders'].map(path=>rm(path,{recursive:true,force:true})));}}],
});
