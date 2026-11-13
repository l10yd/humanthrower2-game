import { describe,it,expect } from 'vitest';
import { validateCharacterMetadata } from '../../src/assets/CharacterMetadata';
import { metadataFixture } from '../fixtures/CharacterMetadataFixture';
import { box,vertices } from '../../src/slicing/ConvexClipper';
describe('bounded character metadata validation',()=>{
 it('accepts all expected limbs/links, copies the input and requires SI/Y-up',()=>{
  const source=metadataFixture(),before=JSON.stringify(source),valid=validateCharacterMetadata(source);expect(valid.parts).toHaveLength(11);expect(valid.joints).toHaveLength(10);expect(valid.parts.reduce((s,p)=>s+p.mass,0)).toBe(72);
  valid.parts[0].hull.faces[0].vertices[0].x=99;expect(JSON.stringify(source)).toBe(before);
  for(const change of [{schemaVersion:2},{units:'centimeters'},{upAxis:'Z'}])expect(()=>validateCharacterMetadata({...source,...change})).toThrow('schema');
 });
 it('rejects missing/duplicate limbs and anatomical links, malformed ranges and bad frames',()=>{
  const source=metadataFixture();source.parts[1].name='head';expect(()=>validateCharacterMetadata(source)).toThrow('duplicate');
  const links=metadataFixture();links.joints[1]=links.joints[0];expect(()=>validateCharacterMetadata(links)).toThrow('duplicate');
  const limits=metadataFixture();limits.joints[0].limits=[[1,-1],[-1,1],[-1,1]];expect(()=>validateCharacterMetadata(limits)).toThrow('range');
  const frame=metadataFixture();frame.joints[0].frameA.w=2;expect(()=>validateCharacterMetadata(frame)).toThrow('frame');
  expect(()=>validateCharacterMetadata({parts:[]})).toThrow();
 });
 it('rejects inconsistent anchors, tissue outside hulls and mass totals',()=>{
  const anchor=metadataFixture();anchor.joints[0].anchorA.x=.1;expect(()=>validateCharacterMetadata(anchor)).toThrow('coincide');
  const tissue=metadataFixture();tissue.joints[0].connector.a=box(2,2,2);expect(()=>validateCharacterMetadata(tissue)).toThrow('outside physical hull');
  const mass=metadataFixture();mass.parts[0].mass=20;expect(()=>validateCharacterMetadata(mass)).toThrow('72 kg');
 });
 it('rejects missing/malformed UVs, non-finite hulls and excessive input before positional welding',()=>{
  const uv=metadataFixture();delete uv.parts[0].hull.faces[0].uvs;expect(()=>validateCharacterMetadata(uv)).toThrow('authored UV');
  const invalid=metadataFixture();vertices(invalid.parts[0].hull)[0].x=NaN;expect(()=>validateCharacterMetadata(invalid)).toThrow('vector');
  const huge=metadataFixture();huge.parts[0].hull.faces=Array.from({length:1000},()=>huge.parts[0].hull.faces[0]);expect(()=>validateCharacterMetadata(huge)).toThrow('asset faces');
 });
 it('rejects sparse arrays instead of silently skipping missing parts, UV corners or limits',()=>{
  const parts=metadataFixture();delete (parts.parts as unknown[])[3];expect(()=>validateCharacterMetadata(parts)).toThrow();
  const uv=metadataFixture();uv.parts[0].hull.faces[0].uvs=new Array(4);expect(()=>validateCharacterMetadata(uv)).toThrow();
  const limits=metadataFixture();limits.joints[0].limits=new Array(3);expect(()=>validateCharacterMetadata(limits)).toThrow();
 });
 it('cannot claim production readiness merely because overlapping fixture metadata passed',()=>{
  const valid=validateCharacterMetadata(metadataFixture());expect(valid.parts.every(p=>p.position.x===0&&p.position.y===0&&p.position.z===0)).toBe(true);
  // Deliberately no asset-ready field: overlap/render/texture checks are separate gates.
  expect('ready' in valid).toBe(false);
 });
});
