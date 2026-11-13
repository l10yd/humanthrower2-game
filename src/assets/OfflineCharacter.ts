import { Group,Mesh,BufferGeometry,BufferAttribute,MeshBasicMaterial,Texture } from 'three';
import { inspectCharacterGlb } from './CharacterGlb';
import { validateCharacterRestPose } from './CharacterRestPose';
import { validateCharacterModel } from './CharacterModel';
import { disposeCharacterModel } from './CharacterGlb';
/** Offline structural/surface gate. Decode the inspected uncompressed accessors
 * directly, never invoke a browser image decoder or fetch an external resource. */
export function validateOfflineCharacter(bytes:ArrayBuffer,input:unknown){
 const metadata=validateCharacterRestPose(input),inspected=inspectCharacterGlb(bytes),document=inspected.document;
 const doc=document as unknown as {
  nodes:{name?:string;mesh?:number;children?:number[];translation?:number[];rotation?:number[];scale?:number[];matrix?:number[]}[];
  scenes:{nodes:number[]}[];meshes:{name?:string;primitives:{attributes:Record<string,number>;indices?:number;material?:number}[]}[];
  accessors:{bufferView:number;byteOffset?:number;componentType:number;type:string;count:number;normalized?:boolean}[];
  bufferViews:{byteOffset?:number;byteStride?:number}[];materials?:{pbrMetallicRoughness?:{baseColorTexture?:{index:number}}}[];
  textures?:{source:number}[];
 };
 const view=new DataView(bytes);let offset=12,bin=0;
 while(offset<bytes.byteLength){const size=view.getUint32(offset,true),type=view.getUint32(offset+4,true);if(type===0x004e4942)bin=offset+8;offset+=8+size;}
 const readAccessor=(id:number)=>{
  const a=doc.accessors[id],b=doc.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3}[a.type];
  if(!components||a.normalized)throw Error('Unsupported offline accessor');
  const size={5121:1,5123:2,5125:4,5126:4}[a.componentType];if(!size)throw Error('Unsupported offline component');
  const values=a.componentType===5126?new Float32Array(a.count*components):new Uint32Array(a.count*components),start=bin+(b.byteOffset??0)+(a.byteOffset??0),stride=b.byteStride??size*components;
  for(let i=0;i<a.count;i++)for(let j=0;j<components;j++){
   const at=start+i*stride+j*size;values[i*components+j]=a.componentType===5126?view.getFloat32(at,true):a.componentType===5125?view.getUint32(at,true):a.componentType===5123?view.getUint16(at,true):view.getUint8(at);
  }
  return new BufferAttribute(values,components);
 };
 const root=new Group();
 try{
  const nodes=doc.nodes.map(node=>{
   const object=node.mesh===undefined?new Group():new Mesh(new BufferGeometry(),new MeshBasicMaterial());object.name=node.name??'';
   // Attach immediately so allocation/attribute failures also dispose resources.
   root.add(object);
   if(object instanceof Mesh){const mesh=doc.meshes[node.mesh!],primitive=mesh.primitives[0];object.name=node.name??mesh.name??'';
    for(const [attribute,key] of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0']])object.geometry.setAttribute(attribute,readAccessor(primitive.attributes[key]));
    if(primitive.indices!==undefined)object.geometry.setIndex(readAccessor(primitive.indices));
    const textureIndex=doc.materials?.[primitive.material??-1]?.pbrMetallicRoughness?.baseColorTexture?.index;
    if(textureIndex!==undefined){const image=inspected.images[doc.textures?.[textureIndex]?.source??-1];if(!image)throw Error('Invalid offline material texture');const texture=new Texture({width:image.width,height:image.height});object.material.map=texture;}
   }
   if(node.matrix){if(node.matrix.length!==16||!node.matrix.every(Number.isFinite))throw Error('Invalid offline node matrix');object.matrix.fromArray(node.matrix);object.matrixAutoUpdate=false;}
   else{
    for(const [values,count]of [[node.translation,3],[node.rotation,4],[node.scale,3]] as const)if(values&&(values.length!==count||!values.every(Number.isFinite)))throw Error('Invalid offline node transform');
    if(node.translation)object.position.fromArray(node.translation);if(node.rotation)object.quaternion.fromArray(node.rotation);if(node.scale)object.scale.fromArray(node.scale);
   }
   return object;
  });
  doc.nodes.forEach((n,i)=>n.children?.forEach(child=>nodes[i].add(nodes[child])));
  const validation=validateCharacterModel(root,metadata,{strictSurface:true});
  return {bytes:inspected.bytes,parts:validation.parts,triangles:validation.triangles,maxSurfaceError:validation.maxSurfaceError,surfaceUpperBound:validation.surfaceUpperBound,surfaceCells:validation.surfaceCells,mass:metadata.parts.reduce((s,p)=>s+p.mass,0),connectors:metadata.joints.length,images:inspected.images.map(i=>({width:i.width,height:i.height,mimeType:i.mimeType})),checks:['metadata','rest-pose','GLB-container','decoded-accessors','render-hull-certified-bound','image-headers'],limitations:['Image payloads are header-checked, not codec-decoded.','Surface certification is numerical and fails closed when subdivision budgets are exhausted.','Dynamic physics and visual quality are not validated.']};
 }finally{disposeCharacterModel(root);}
}
