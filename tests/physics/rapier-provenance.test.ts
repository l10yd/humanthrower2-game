import { it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import provenance from '../fixtures/rapier-build-provenance.json';
const packageRoot=new URL('../../node_modules/@dimforge/rapier3d-compat/',import.meta.url);
it('pinned installed and compat-embedded WASM agree with the captured release fingerprint',()=>{
 const packageJson=JSON.parse(readFileSync(new URL('package.json',packageRoot),'utf8'));
 const wasm=readFileSync(new URL('dist/rapier_wasm3d_bg.wasm',packageRoot));
 const js=readFileSync(new URL('dist/rapier.mjs',packageRoot),'utf8'),embedded=js.match(/AGFzbQE[A-Za-z0-9+/=]{1000,}/)?.[0];
 expect(packageJson.version).toBe(provenance.jsVersion);expect(wasm.byteLength).toBe(provenance.wasmSize);expect(createHash('sha256').update(wasm).digest('hex')).toBe(provenance.wasmSha256);
 expect(embedded).toBeDefined();expect(Buffer.from(embedded!,'base64')).toEqual(wasm);
 const lock=JSON.parse(readFileSync(new URL('../../package-lock.json',import.meta.url),'utf8'));
 expect(lock.packages['node_modules/@dimforge/rapier3d-compat'].integrity).toBe(provenance.tarballIntegrity);
});
