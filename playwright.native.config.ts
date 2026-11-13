import {defineConfig} from '@playwright/test';
import base from './playwright.config';
const port=Number(process.env.HUMANTHROWER_TEST_PORT??5188),url=`http://127.0.0.1:${port}`;
export default defineConfig({...base,testDir:'tests/diagnostics',testMatch:'native-natural.spec.ts',use:{...base.use,baseURL:url},webServer:{command:`npm run dev -- --config vite.native.config.ts --port ${port} --strictPort`,url,reuseExistingServer:false}});
