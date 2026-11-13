import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
import {validateOfflineCharacter} from '../../src/assets/OfflineCharacter';
import {characterGlbFixture,encodeGlb} from '../fixtures/CharacterGlbFixture';
it('offline accessors validate the same synthetic rigid meshes without browser globals',()=>{
 const f=characterGlbFixture(),report=validateOfflineCharacter(f.bytes,f.metadata);
 expect(report.parts).toBe(11);expect(report.mass).toBe(72);expect(report.connectors).toBe(10);expect(report.maxSurfaceError).toBeLessThan(1e-6);expect(report.limitations).toHaveLength(3);
});
it('offline validation rejects corrupt positions, indices, transforms, metadata and external URIs',()=>{
 const f=characterGlbFixture(),corrupt=f.bin.slice();new DataView(corrupt.buffer).setFloat32(0,100,true);
 expect(()=>validateOfflineCharacter(encodeGlb(f.document,corrupt),f.metadata)).toThrow(/surface mismatch/);
 const transform=structuredClone(f.document);(transform.nodes[0] as {translation:number[]}).translation[0]+=1;
 expect(()=>validateOfflineCharacter(encodeGlb(transform,f.bin),f.metadata)).toThrow(/transform/);
 const external=structuredClone(f.document);Object.assign(external.buffers[0],{uri:'https://invalid.example/mesh.bin'});
 expect(()=>validateOfflineCharacter(encodeGlb(external,f.bin),f.metadata)).toThrow(/external/);
 const metadata=structuredClone(f.metadata);metadata.parts[0].mass=0;expect(()=>validateOfflineCharacter(f.bytes,metadata)).toThrow(/mass/);
 const normals=f.bin.slice(),view=new DataView(normals.buffer);view.setFloat32((f.document.bufferViews[1] as {byteOffset:number}).byteOffset,NaN,true);
 expect(()=>validateOfflineCharacter(encodeGlb(f.document,normals),f.metadata)).toThrow(/attribute/);
});
it('all three actual shipping character GLBs pass offline surface/metadata/image-header validation',async()=>{
 for(const [folder,stem]of [['reference-worker','worker'],['reference-scout','scout'],['reference-bruiser','bruiser']]){
  const base=`public/assets/${folder}/${stem}`,[buffer,source]=await Promise.all([readFile(`${base}.glb`),readFile(`${base}.metadata.json`,'utf8')]);
  const report=validateOfflineCharacter(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),JSON.parse(source));
  expect(report.parts).toBe(11);expect(report.triangles).toBeLessThanOrEqual(850);expect(report.images).toEqual([{width:128,height:128,mimeType:'image/png'}]);expect(report.maxSurfaceError).toBeLessThan(.04);expect(report.surfaceUpperBound).toBeLessThanOrEqual(.04);expect(report.surfaceCells).toBeGreaterThan(0);
 }
});
it('asset CLI produces machine-readable output and nonzero status for invalid input',()=>{
 const output=execFileSync(process.execPath,['scripts/validate-character.mjs','public/assets/reference-worker/worker.glb','public/assets/reference-worker/worker.metadata.json','--json'],{encoding:'utf8'}),report=JSON.parse(output);
 expect(report.ok).toBe(true);expect(report.connectors).toBe(10);expect(report.triangles).toBe(676);
 const failure=spawnSync(process.execPath,['scripts/validate-character.mjs','package.json','package.json','--json'],{encoding:'utf8'});
 expect(failure.status).toBe(1);expect(JSON.parse(failure.stdout).ok).toBe(false);
 const usage=spawnSync(process.execPath,['scripts/validate-character.mjs'],{encoding:'utf8'});expect(usage.status).toBe(2);
},20000);
