import { defineConfig } from 'vite';
import { rm } from 'node:fs/promises';
export default defineConfig({
 base:'./',
 optimizeDeps:{include:['maplibre-gl','three','three/addons/utils/BufferGeometryUtils.js']},
 plugins:[{name:'omit-legacy-static-assets',apply:'build',async closeBundle(){await Promise.all(['dist/data','dist/renders'].map(path=>rm(path,{recursive:true,force:true})));}}],
});
