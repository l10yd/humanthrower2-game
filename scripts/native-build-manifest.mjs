import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const paths=['.pi/native-build/artifacts/baseline.wasm','.pi/native-build/artifacts/eigenframe-broad.wasm','.pi/native-build/artifacts/eigenframe-narrow.wasm','.pi/native-build/artifacts/baseline-Cargo.lock','.pi/native-build/source/bindings/typescript/Cargo.lock','.pi/native-build/artifacts/eigenframe-narrow.patch'];
const artifacts=await Promise.all(paths.map(async path=>({path,bytes:(await stat(path)).size,sha256:createHash('sha256').update(await readFile(path)).digest('hex')})));
const report={sourceCommit:'b716d375efc0201003f0cd9ef7168eee0b62c177',rust:'1.100.0 (0ef1bc386 2026-11-09)',cargo:'1.100.0 (3acc79c0c 2026-11-05)',host:'x86_64-pc-windows-msvc',target:'wasm32-unknown-unknown',wasmPack:'0.12.1',wasmBindgen:'0.2.130',binaryen:112,dependencies:{rapier:'0.36.0',parry:'0.31.1',glamx:'0.3.1',glam:'0.33.12'},artifacts,productionAdopted:false};
await writeFile('.pi/native-build/build-manifest.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
