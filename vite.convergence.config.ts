import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// Explicit isolated research harness. Never used by npm test/build/runtime.
const pkg=process.env.HUMANTHROWER_CANDIDATE_PACKAGE,pgs=Number(process.env.HUMANTHROWER_CANDIDATE_PGS);
if(!pkg||![1,4,8,16].includes(pgs))throw Error('Explicit candidate package and bounded PGS required');
export default defineConfig({resolve:{alias:{'@dimforge/rapier3d-compat':resolve(pkg)}},test:{include:['tests/physics/ragdoll.test.ts','tests/physics/kcc-pile.test.ts'],setupFiles:['tests/diagnostics/impulse-convergence-world.setup.ts'],testTimeout:30000,maxWorkers:1}});
