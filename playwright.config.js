import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  timeout:120000,
  testDir:'./tests', testMatch:'*.spec.js', workers:1,
  use:{baseURL:'http://127.0.0.1:5175',headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}},
  webServer:{command:'npm run dev -- --port 5175 --strictPort',url:'http://127.0.0.1:5175',reuseExistingServer:false},
});
