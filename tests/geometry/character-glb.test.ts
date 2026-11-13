import { it,expect } from 'vitest';
import { inspectCharacterGlb } from '../../src/assets/CharacterGlb';
import { characterGlbFixture,encodeGlb } from '../fixtures/CharacterGlbFixture';
it('bounded self-contained binary fixture passes declared geometry checks',()=>{
 const f=characterGlbFixture(),report=inspectCharacterGlb(f.bytes);expect(report.declaredTriangles).toBe(132);expect(report.bytes).toBe(f.bytes.byteLength);
});
it('bad headers, truncation, out-of-bounds chunks and excessive file sizes fail before decode',()=>{
 const f=characterGlbFixture();expect(()=>inspectCharacterGlb(f.bytes.slice(0,18))).toThrow();const bytes=f.bytes.slice(0);new DataView(bytes).setUint32(0,0,true);expect(()=>inspectCharacterGlb(bytes)).toThrow('header');
 const length=f.bytes.slice(0);new DataView(length).setUint32(12,0xffffffff,true);expect(()=>inspectCharacterGlb(length)).toThrow('chunk bounds');
});
it('external data/network image URLs and decoder extensions are refused before GLTFLoader',()=>{
 const f=characterGlbFixture();for(const uri of ['https://example.com/image.png','file:///secret.png','data:image/png;base64,AA'])expect(()=>inspectCharacterGlb(encodeGlb({...f.document,images:[{uri}]},f.bin))).toThrow('external resources');
 expect(()=>inspectCharacterGlb(encodeGlb({...f.document,extensionsRequired:['KHR_draco_mesh_compression']},f.bin))).toThrow('extensions');
});
it('cyclic/unreachable nodes and forged accessor ranges are rejected before decode',()=>{
 const f=characterGlbFixture(),cycle=structuredClone(f.document);(cycle.nodes[0] as {children?:number[]}).children=[0];expect(()=>inspectCharacterGlb(encodeGlb(cycle,f.bin))).toThrow('tree');
 const accessor=structuredClone(f.document);(accessor.accessors[0] as {count:number}).count=2500;expect(()=>inspectCharacterGlb(encodeGlb(accessor,f.bin))).toThrow('accessor out of bounds');
 const refs=structuredClone(f.document);(refs.meshes[0] as {primitives:{attributes:Record<string,number>}[]}).primitives[0].attributes.POSITION=9999;expect(()=>inspectCharacterGlb(encodeGlb(refs,f.bin))).toThrow('surface accessor');
});
it('wrong primitive topology, skins/animations and malformed binary buffer references fail',()=>{
 const f=characterGlbFixture();const wrong=structuredClone(f.document);(wrong.meshes[0] as {primitives:{mode?:number}[]}).primitives[0].mode=1;expect(()=>inspectCharacterGlb(encodeGlb(wrong,f.bin))).toThrow('primitive');
 expect(()=>inspectCharacterGlb(encodeGlb({...f.document,skins:[{}]},f.bin))).toThrow('rigid static');
 expect(()=>inspectCharacterGlb(encodeGlb({...f.document,bufferViews:[{buffer:0,byteOffset:999999,byteLength:10}]},f.bin))).toThrow('out of bounds');
});
