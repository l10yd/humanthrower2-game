import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {inspectCharacterGlb} from '../../src/assets/CharacterGlb';
import {validateCharacterRestPose} from '../../src/assets/CharacterRestPose';
import {meshSurface,scaleSurface,clipCharacterSurface} from '../../src/assets/ReferenceCharacter';
import {clip,validate,massProperties,vertices} from '../../src/slicing/ConvexClipper';
import {vec} from '../../src/slicing/Math';
const path='public/assets/reference-worker/';
const file=readFileSync(`${path}worker.glb`),bytes=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength) as ArrayBuffer;
const metadata=JSON.parse(readFileSync(`${path}worker.metadata.json`,'utf8'));
const inspected=inspectCharacterGlb(bytes),doc=inspected.document as any;
const jsonBytes=new DataView(bytes).getUint32(12,true),binStart=28+jsonBytes;
function meshes(){
 return doc.nodes.map((node:any)=>{
  const primitive=doc.meshes[node.mesh].primitives[0],g=new BufferGeometry();
  for(const [key,attribute,size] of [['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]] as const){
   const a=doc.accessors[primitive.attributes[key]],b=doc.bufferViews[a.bufferView],offset=binStart+(b.byteOffset??0)+(a.byteOffset??0),stride=b.byteStride??size*4,view=new DataView(bytes);
   const values=Array.from({length:a.count*size},(_,i)=>view.getFloat32(offset+Math.floor(i/size)*stride+i%size*4,true));g.setAttribute(attribute,new Float32BufferAttribute(values,size));
  }
  const a=doc.accessors[primitive.indices],b=doc.bufferViews[a.bufferView],offset=binStart+(b.byteOffset??0)+(a.byteOffset??0),view=new DataView(bytes),width=a.componentType===5123?2:4;
  g.setIndex(Array.from({length:a.count},(_,i)=>width===2?view.getUint16(offset+i*2,true):view.getUint32(offset+i*4,true)));
  return {name:node.name,g};
 });
}
describe('shipping Blender art prototype',()=>{
 it('actual self-contained GLB and metadata pass budgets, rest pose and texture policy',()=>{
  const data=validateCharacterRestPose(metadata);expect(data.parts).toHaveLength(11);expect(data.joints).toHaveLength(10);expect(inspected.declaredTriangles).toBe(676);
  expect(inspected.images).toHaveLength(1);expect(inspected.images[0]).toMatchObject({width:128,height:128});expect(doc.samplers[0]).toMatchObject({minFilter:9728,magFilter:9728});
 });
 it('every exported shell is convex, manifold and preserves finite face-corner UVs',()=>{
  for(const {g} of meshes()){const shell=meshSurface(g);validate(shell);expect(massProperties(shell).volume).toBeGreaterThan(0);expect(shell.faces.length).toBeLessThan(128);expect(shell.faces.every(f=>f.uvs?.length===f.vertices.length&&f.uvs.every(uv=>Number.isFinite(uv.u+uv.v)))).toBe(true);g.dispose();}
 });
 it('repeated art-only cuts remain closed and inside the actual surviving cut planes',()=>{
  for(const {g} of meshes()){
   const shell=scaleSurface(meshSurface(g),vec(2,2.1,2));let hull=clip(shell,vec(0,1,0),0)!;hull=clip(hull,vec(1,0,0),0)!;
   const result=clipCharacterSurface(shell,hull)!;validate(result);expect(result.faces.filter(f=>f.cap).length).toBe(2);expect(vertices(result).every(v=>v.y<=1e-8&&v.x<=1e-8)).toBe(true);g.dispose();
  }
 });
});
