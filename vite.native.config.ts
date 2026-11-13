import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// Isolated diagnostic server only. Production vite.config.ts is unchanged.
const pkg=process.env.HUMANTHROWER_NATIVE_PACKAGE??'.pi/native-build/baseline-package/rapier.mjs';
export default defineConfig({resolve:{alias:{'@dimforge/rapier3d-compat':resolve(pkg)}}});
