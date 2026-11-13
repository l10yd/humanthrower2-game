import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testDir:'tests/diagnostics',testMatch:['capture-thin.spec.ts','thin-from-birth.spec.ts']});
