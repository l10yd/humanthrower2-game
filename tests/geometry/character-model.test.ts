import { it,expect } from 'vitest';
import { Mesh,DataTexture,Float32BufferAttribute } from 'three';
import { validateCharacterModel } from '../../src/assets/CharacterModel';
import { convexOverlapDepth } from '../../src/assets/ConvexOverlap';
import { modelFixture } from '../fixtures/CharacterModelFixture';
import { box } from '../../src/slicing/ConvexClipper';
import { identity,axisAngle,vec } from '../../src/slicing/Math';
it('matching rigid meshes pass surface/rest-pose checks and retain decoded geometry',()=>{
 const f=modelFixture();try{
  const mesh=f.root.children[0] as Mesh,before=Array.from(mesh.geometry.getAttribute('position').array),result=validateCharacterModel(f.root,f.metadata);
  expect(result.parts).toBe(11);expect(result.triangles).toBe(132);expect(result.maxSurfaceError).toBeLessThan(1e-6);expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(before);
 }finally{f.dispose();}
});
it('global root placement is ignored but unapplied part scale, wrong pivots and shear are rejected',()=>{
 const f=modelFixture();try{
  f.root.position.set(10,20,-30);f.root.rotation.y=.4;expect(validateCharacterModel(f.root,f.metadata).parts).toBe(11);
  const mesh=f.root.children[0] as Mesh;mesh.scale.x=2;expect(()=>validateCharacterModel(f.root,f.metadata)).toThrow('scale');mesh.scale.x=1;mesh.position.x+=.01;expect(()=>validateCharacterModel(f.root,f.metadata)).toThrow('transform');
 }finally{f.dispose();}
});
it('missing/duplicate mesh names, absent UVs and invalid indices are rejected',()=>{
 const f=modelFixture();try{
  const mesh=f.root.children[0] as Mesh;mesh.name='wrong';expect(()=>validateCharacterModel(f.root,f.metadata)).toThrow('name');mesh.name=f.metadata.parts[0].name;
  mesh.geometry.deleteAttribute('uv');expect(()=>validateCharacterModel(f.root,f.metadata)).toThrow('attributes');
 }finally{f.dispose();}
 const g=modelFixture();try{const mesh=g.root.children[0] as Mesh;mesh.geometry.setIndex([0,1,999]);expect(()=>validateCharacterModel(g.root,g.metadata)).toThrow('index');}finally{g.dispose();}
});
it('missing hull faces are detected by the reverse surface comparison',()=>{
 const f=modelFixture();try{
  const mesh=f.root.children[0] as Mesh;const positions=mesh.geometry.getAttribute('position');
  mesh.geometry.setAttribute('position',new Float32BufferAttribute(Array.from(positions.array).slice(0,18),3));mesh.geometry.setAttribute('uv',new Float32BufferAttribute(new Array(12).fill(0),2));mesh.geometry.setAttribute('normal',new Float32BufferAttribute([0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1],3));
  expect(()=>validateCharacterModel(f.root,f.metadata)).toThrow('surface mismatch');
 }finally{f.dispose();}
});
it('non-unit decoded normals, morph targets and reflected scales are rejected',()=>{
 const f=modelFixture();try{const mesh=f.root.children[0] as Mesh;mesh.geometry.getAttribute('normal').setXYZ(0,0,0,0);expect(()=>validateCharacterModel(f.root,f.metadata)).toThrow('surface attribute');}finally{f.dispose();}
 const g=modelFixture();try{const mesh=g.root.children[0] as Mesh;mesh.geometry.morphAttributes.position=[mesh.geometry.getAttribute('position')];expect(()=>validateCharacterModel(g.root,g.metadata)).toThrow('morph');}finally{g.dispose();}
 const h=modelFixture();try{h.root.children[0].scale.x=-1;expect(()=>validateCharacterModel(h.root,h.metadata)).toThrow('scale');}finally{h.dispose();}
});
it('decoded oversized textures are rejected separately from metadata geometry',()=>{
 const f=modelFixture(),texture=new DataTexture(new Uint8Array(256*256*4),256,256);try{
  const mesh=f.root.children[0] as Mesh;(mesh.material as import('three').MeshBasicMaterial).map=texture;expect(()=>validateCharacterModel(f.root,f.metadata)).toThrow('texture dimensions');
 }finally{texture.dispose();f.dispose();}
});
it('render vertices farther than 4cm from the hull fail and convex SAT handles containment and rotation',()=>{
 const f=modelFixture();try{const mesh=f.root.children[0] as Mesh;mesh.geometry.translate(0,0,.1);expect(()=>validateCharacterModel(f.root,f.metadata)).toThrow('surface mismatch');}finally{f.dispose();}
 expect(convexOverlapDepth(box(1,1,1),vec(),identity,box(.1,.1,.1),vec(),identity)).toBeGreaterThan(1);
 expect(convexOverlapDepth(box(1,1,1),vec(),identity,box(1,1,1),vec(2,0,0),identity)).toBe(0);
 expect(convexOverlapDepth(box(.3,.3,.3),vec(),axisAngle(vec(0,1,0),.5),box(.3,.3,.3),vec(.2,0,0),identity)).toBeGreaterThan(0);
});
