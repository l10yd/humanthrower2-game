import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {Group,Mesh,MeshBasicMaterial,Texture,BufferGeometry,Float32BufferAttribute} from 'three';
import {inspectCharacterGlb} from '../../src/assets/CharacterGlb';
import {validateIndustrialShaft} from '../../src/assets/IndustrialShaft';
const raw=readFileSync('public/assets/industrial-shaft/shaft.glb'),bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength) as ArrayBuffer;
const inspected=inspectCharacterGlb(bytes),doc=inspected.document as any,binStart=28+new DataView(bytes).getUint32(12,true);
function decoded(){
 const root=new Group(),texture=new Texture({width:128,height:128} as any),material=new MeshBasicMaterial({map:texture});
 for(const node of doc.nodes){const primitive=doc.meshes[node.mesh].primitives[0],g=new BufferGeometry();
  for(const [key,name,size] of [['POSITION','position',3],['NORMAL','normal',3],['TEXCOORD_0','uv',2]] as const){
   const a=doc.accessors[primitive.attributes[key]],b=doc.bufferViews[a.bufferView],offset=binStart+(b.byteOffset??0)+(a.byteOffset??0),stride=b.byteStride??size*4,v=new DataView(bytes);
   g.setAttribute(name,new Float32BufferAttribute(Array.from({length:a.count*size},(_,i)=>v.getFloat32(offset+Math.floor(i/size)*stride+i%size*4,true)),size));
  }
  const a=doc.accessors[primitive.indices],b=doc.bufferViews[a.bufferView],offset=binStart+(b.byteOffset??0)+(a.byteOffset??0),v=new DataView(bytes);
  g.setIndex(Array.from({length:a.count},(_,i)=>v.getUint16(offset+i*2,true)));const mesh=new Mesh(g,material);mesh.name=node.name;root.add(mesh);
 }
 return root;
}
describe('industrial shaft asset',()=>{
 it('actual Blender export passes strict embedded GLB policy and baked arena-envelope validation',()=>{
  expect(inspected.declaredTriangles).toBe(648);expect(inspected.images).toHaveLength(1);expect(inspected.images[0]).toMatchObject({width:128,height:128});
  expect(doc.samplers[0]).toMatchObject({magFilter:9728,minFilter:9728});expect(validateIndustrialShaft(decoded())).toEqual({parts:11,triangles:648,textures:1});
 });
 it('rejects an unknown mesh, unapplied transform and rear decor crossing its authoring depth bound',()=>{
  const unknown=decoded();unknown.children[0].name='extra';expect(()=>validateIndustrialShaft(unknown)).toThrow('mesh');
  const shifted=decoded();shifted.children[0].position.x=.1;expect(()=>validateIndustrialShaft(shifted)).toThrow('transforms');
  const front=decoded(),pipe=front.getObjectByName('shaft_pipes') as Mesh,p=pipe.geometry.getAttribute('position');p.setZ(0,0);expect(()=>validateIndustrialShaft(front)).toThrow('depth');
 });
});
