import { defineConfig } from 'vite';
export default defineConfig({
 publicDir:false,
 build:{outDir:'build-embed',lib:{entry:'src/mratkino-map.js',name:'MratkinoComponent',formats:['iife'],fileName:()=> 'mratkino.js'},rollupOptions:{output:{inlineDynamicImports:true}}},
});
