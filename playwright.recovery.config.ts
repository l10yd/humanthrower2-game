import {defineConfig} from '@playwright/test';
const port=5196,baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({workers:1,testDir:'tests/diagnostics',testMatch:'recovery-routes.spec.ts',use:{baseURL,launchOptions:{args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}},webServer:{command:`npm run dev -- --port ${port} --strictPort`,url:baseURL,reuseExistingServer:false},timeout:90000});
