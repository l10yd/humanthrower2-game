import { geometry } from '../../src/rendering/RetroRenderer';
import { restPoseFixture } from './CharacterRestFixture';
/** Build a tiny self-contained GLB without Blender/FileReader for parser tests.
 * This is a synthetic box rig, not a shipping character. */
export function characterGlbFixture(){
 const metadata=restPoseFixture(),buffers:Uint8Array[]=[],bufferViews:object[]=[],accessors:object[]=[],nodes:object[]=[],meshes:object[]=[];let byteOffset=0;
 for(const part of metadata.parts){
  const g=geometry(part.hull),attributes:Record<string,number>={};
  for(const [name,key,type]of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2']] as const){
   const attr=g.getAttribute(name),array=new Float32Array(Array.from(attr.array)),data=new Uint8Array(array.buffer);buffers.push(data);bufferViews.push({buffer:0,byteOffset,byteLength:data.length});byteOffset+=data.length;
   const accessor:Record<string,unknown>={bufferView:bufferViews.length-1,componentType:5126,count:attr.count,type};
   if(key==='POSITION'){accessor.min=[-.1,-.1,-.1];accessor.max=[.1,.1,.1];}
   accessors.push(accessor);attributes[key]=accessors.length-1;
  }
  meshes.push({name:part.name,primitives:[{attributes}]});nodes.push({name:part.name,mesh:meshes.length-1,translation:[part.position.x,part.position.y,part.position.z]});g.dispose();
 }
 const document={asset:{version:'2.0',generator:'Humanthrower test-only synthetic GLB'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,buffers:[{byteLength:byteOffset}],bufferViews,accessors};
 const bin=new Uint8Array(byteOffset);let offset=0;for(const bytes of buffers){bin.set(bytes,offset);offset+=bytes.length;}
 return {metadata,document,bin,bytes:encodeGlb(document,bin)};
}
export function texturedCharacterGlbFixture(image:Uint8Array,mimeType='image/png'){
 const f=characterGlbFixture(),bin=new Uint8Array(f.bin.length+image.length);bin.set(f.bin);bin.set(image,f.bin.length);
 const document={...f.document,buffers:[{byteLength:bin.length}],bufferViews:[...f.document.bufferViews,{buffer:0,byteOffset:f.bin.length,byteLength:image.length}],images:[{bufferView:f.document.bufferViews.length,mimeType}],textures:[{source:0}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:1}}],meshes:f.document.meshes.map(m=>({...m,primitives:[{...(m as {primitives:object[]}).primitives[0],material:0}]}))};
 return {...f,document,bin,bytes:encodeGlb(document,bin)};
}
export function encodeGlb(document:unknown,bin:Uint8Array){
 const json=new TextEncoder().encode(JSON.stringify(document)),jsonLength=Math.ceil(json.length/4)*4,binLength=Math.ceil(bin.length/4)*4,bytes=new ArrayBuffer(12+8+jsonLength+8+binLength),view=new DataView(bytes);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,bytes.byteLength,true);view.setUint32(12,jsonLength,true);view.setUint32(16,0x4e4f534a,true);
 new Uint8Array(bytes,20,jsonLength).fill(32);new Uint8Array(bytes,20,json.length).set(json);const at=20+jsonLength;view.setUint32(at,binLength,true);view.setUint32(at+4,0x004e4942,true);new Uint8Array(bytes,at+8,bin.length).set(bin);return bytes;
}
