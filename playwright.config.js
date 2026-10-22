import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  timeout:120000,
  testDir:'./tests', testMatch:'*.spec.js', workers:1,
  use:{baseURL:'http://127.0.0.1:5175',headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}},
  webServer:[{command:process.env.TILE_TEST_PYTHON?process.env.TILE_TEST_PYTHON+' scripts/tile-test-proxy.py':existsSync('/workspace/mratkino-gis/bin/python')?'/workspace/mratkino-gis/bin/python scripts/tile-test-proxy.py':'python3 scripts/tile-test-proxy.py',url:'http://127.0.0.1:4399/health',reuseExistingServer:true},{command:process.env.TEST_PRODUCTION?'npm run preview -- --port 5175 --strictPort':'npm run dev -- --port 5175 --strictPort',url:'http://127.0.0.1:5175',reuseExistingServer:false}],
});
