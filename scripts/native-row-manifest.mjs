import {readFile,writeFile,stat,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='.pi/native-build',wasm=`${root}/source/bindings/typescript/rapier-compat/builds/3d/row-trace-controls-wasm/rapier_wasm3d_bg.wasm`;
await copyFile(wasm,`${root}/artifacts/row-trace-controls.wasm`);
await copyFile(`${root}/source/bindings/typescript/Cargo.lock`,`${root}/artifacts/row-trace-controls-Cargo.lock`);
const paths=[`${root}/artifacts/row-trace-controls.wasm`,`${root}/artifacts/row-trace-controls-Cargo.lock`,
 `${root}/source/src/dynamics/solver/row_trace.rs`,`${root}/source/src/dynamics/solver/staged_island_solver/worker.rs`,
 `${root}/source/src/pipeline/physics_pipeline/substep.rs`,`${root}/source/src/dynamics/solver/contact_constraint/contact_with_twist_friction.rs`,
 `${root}/source/bindings/typescript/src/dynamics/rigid_body.rs`,`${root}/source/bindings/typescript/src/dynamics/integration_parameters.rs`,
 'scripts/verify-native-row-trace.mjs','scripts/native-row-analysis.mjs'];
const artifacts=await Promise.all(paths.map(async path=>({path,bytes:(await stat(path)).size,sha256:createHash('sha256').update(await readFile(path)).digest('hex')})));
await writeFile(`${root}/row-trace-controls-manifest.json`,JSON.stringify({sourceCommit:'b716d375efc0201003f0cd9ef7168eee0b62c177',productionAdopted:false,
 scope:'Read-only observer plus opt-in diagnostic controls; 11 pinned one-step variants, no full-world stability acceptance',artifacts},null,2));
