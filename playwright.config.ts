import { defineConfig } from '@playwright/test';
const port=Number(process.env.HUMANTHROWER_TEST_PORT??5173);
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({workers:1,testDir:'tests/browser',expect:{timeout:15000},use:{baseURL,viewport:{width:1280,height:900},launchOptions:{args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}},webServer:{command:`npm run dev -- --port ${port} --strictPort`,url:baseURL,reuseExistingServer:process.env.HUMANTHROWER_TEST_FRESH!=='1'},timeout:60000});
