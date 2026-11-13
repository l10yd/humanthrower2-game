import { AssetDeadline } from './AssetDeadline';
import { CharacterResources,CharacterTasks } from './CharacterResources';
import { IMAGE_LIMITS,inspectImageHeader } from './ImageHeader';
import { Group,Texture,NearestFilter,LinearFilter,RepeatWrapping,ClampToEdgeWrapping,MirroredRepeatWrapping } from 'three';
import { validateCharacterRestPose } from './CharacterRestPose';
import { validateCharacterModel } from './CharacterModel';
export const MAX_CHARACTER_GLB_BYTES=16*1024*1024;
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid GLB document');return v as Record<string,unknown>;};
/** Inspect the container and external-resource policy before GLTFLoader can fetch
 * or allocate decoded surfaces. Only self-contained binary rigid-part GLBs. */
export function inspectCharacterGlb(bytes:ArrayBuffer){
 if(bytes.byteLength<20||bytes.byteLength>MAX_CHARACTER_GLB_BYTES)throw Error('Invalid character GLB size');
 const view=new DataView(bytes);if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)throw Error('Invalid GLB header');
 let offset=12,json:unknown,binLength=0,binOffset=0,chunk=0;
 while(offset<bytes.byteLength){
  if(offset+8>bytes.byteLength)throw Error('Truncated GLB chunk');const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);offset+=8;
  if(length%4||offset+length>bytes.byteLength)throw Error('Invalid GLB chunk bounds');
  if(chunk===0&&type===0x4e4f534a){if(length>1024*1024)throw Error('GLB JSON budget exceeded');json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes,offset,length)));}
  else if(chunk===1&&type===0x004e4942){binLength=length;binOffset=offset;}else throw Error('Unsupported GLB chunk layout');
  offset+=length;chunk++;
 }
 const document=record(json),asset=record(document.asset);if(asset.version!=='2.0')throw Error('Unsupported glTF asset version');
 // No data/external URLs at all. Embedded images must reference the BIN chunk.
 const visit=(v:unknown,depth=0)=>{
  if(depth>64)throw Error('GLB nesting budget exceeded');
  if(Array.isArray(v)){if(v.length>10000)throw Error('GLB array budget exceeded');for(const x of v)visit(x,depth+1);}
  else if(v&&typeof v==='object')for(const [key,x]of Object.entries(v)){if(key==='uri')throw Error('Character GLB must not reference external resources');if(key==='extensions'&&Object.keys(record(x)).length)throw Error('GLB extensions require a separately validated decoder');visit(x,depth+1);}
 };
 visit(document);
 if(Array.isArray(document.extensionsRequired)&&document.extensionsRequired.length)throw Error('Required GLB extensions are unsupported');
 if(Array.isArray(document.skins)&&document.skins.length||Array.isArray(document.animations)&&document.animations.length)throw Error('Character GLB must contain rigid static parts');
 if(!Array.isArray(document.meshes)||document.meshes.length!==11||!Array.isArray(document.nodes)||document.nodes.length>64)throw Error('Invalid character GLB mesh/node count');
 if(!Array.isArray(document.scenes)||document.scenes.length!==1||document.scene!==undefined&&document.scene!==0)throw Error('Character GLB must have one scene');
 if(!Array.isArray(document.buffers)||document.buffers.length!==1)throw Error('Character GLB requires one binary buffer');
 const declared=record(document.buffers[0]).byteLength;if(typeof declared!=='number'||!Number.isInteger(declared)||declared<0||declared>binLength||binLength-declared>3)throw Error('GLB binary buffer length mismatch');
 if(!Array.isArray(document.bufferViews)||!Array.isArray(document.accessors)||document.bufferViews.length>512||document.accessors.length>512)throw Error('GLB accessor budget exceeded');
 for(const item of document.bufferViews){const b=record(item),start=b.byteOffset??0,size=b.byteLength;if(b.buffer!==0||typeof start!=='number'||!Number.isInteger(start)||start<0||typeof size!=='number'||!Number.isInteger(size)||size<0||start+size>declared)throw Error('GLB buffer view out of bounds');}
 const accessorTypes:Record<string,number>={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},componentBytes:Record<number,number>={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
 for(const item of document.accessors){const a=record(item),offset=a.byteOffset??0;
  if(a.sparse!==undefined||typeof a.bufferView!=='number'||!Number.isInteger(a.bufferView)||a.bufferView<0||a.bufferView>=document.bufferViews.length||typeof a.type!=='string'||!Object.hasOwn(accessorTypes,a.type)||typeof a.componentType!=='number'||!Object.hasOwn(componentBytes,a.componentType)||typeof a.count!=='number'||!Number.isInteger(a.count)||a.count<0||a.count>2550||typeof offset!=='number'||!Number.isInteger(offset)||offset<0)throw Error('Invalid GLB accessor');
  const b=record(document.bufferViews[a.bufferView]),element=componentBytes[a.componentType]*accessorTypes[a.type],stride=b.byteStride??element;
  if(typeof stride!=='number'||!Number.isInteger(stride)||stride<element||stride>252||offset%componentBytes[a.componentType]!==0||offset+(a.count?stride*(a.count-1)+element:0)>(b.byteLength as number))throw Error('GLB accessor out of bounds');
 }
 if(!Array.isArray(document.images)&&document.images!==undefined)throw Error('Invalid embedded images');
 const images:Array<ReturnType<typeof inspectImageHeader>&{bufferView:number;offset:number;index:number}>=[];let imagePixels=0;
 if(Array.isArray(document.images)){
  if(document.images.length>IMAGE_LIMITS.maxImages)throw Error('Embedded image count exceeded');
  for(const [index,item]of document.images.entries()){
   const image=record(item);if(typeof image.bufferView!=='number'||!Number.isInteger(image.bufferView)||image.bufferView<0||image.bufferView>=document.bufferViews.length||!['image/png','image/jpeg','image/webp'].includes(String(image.mimeType)))throw Error('Unsupported embedded image');
   const bv=record(document.bufferViews[image.bufferView]),offset=binOffset+(bv.byteOffset as number??0),size=bv.byteLength as number;
   const header=inspectImageHeader(new Uint8Array(bytes,offset,size),image.mimeType as string);imagePixels+=header.width*header.height;if(imagePixels>IMAGE_LIMITS.maxPixels)throw Error('Embedded image pixel budget exceeded');
   images.push({...header,bufferView:image.bufferView,offset,index});
  }
 }
 if(document.samplers!==undefined){if(!Array.isArray(document.samplers)||document.samplers.length>12)throw Error('GLB sampler budget exceeded');for(const item of document.samplers){const s=record(item);if(s.magFilter!==undefined&&![9728,9729].includes(s.magFilter as number)||s.minFilter!==undefined&&![9728,9729].includes(s.minFilter as number)||s.wrapS!==undefined&&![33071,33648,10497].includes(s.wrapS as number)||s.wrapT!==undefined&&![33071,33648,10497].includes(s.wrapT as number))throw Error('Unsupported character texture sampler');}}
 if(document.textures!==undefined){if(!Array.isArray(document.textures)||document.textures.length>12)throw Error('GLB texture budget exceeded');for(const item of document.textures){const t=record(item);if(typeof t.source!=='number'||!Number.isInteger(t.source)||t.source<0||t.source>=images.length)throw Error('Invalid GLB texture image');if(t.sampler!==undefined&&(!Array.isArray(document.samplers)||typeof t.sampler!=='number'||!Number.isInteger(t.sampler)||t.sampler<0||t.sampler>=document.samplers.length))throw Error('Invalid GLB texture sampler');}}
 for(const item of document.nodes){const node=record(item);if(node.skin!==undefined||node.camera!==undefined)throw Error('Character GLB node is not a rigid part');if(node.mesh!==undefined&&(typeof node.mesh!=='number'||!Number.isInteger(node.mesh)||node.mesh<0||node.mesh>=11))throw Error('Invalid GLB node mesh');}
 const scene=record(document.scenes[0]);if(!Array.isArray(scene.nodes)||scene.nodes.length>64)throw Error('Invalid GLB scene roots');
 const parent=new Map<number,number>();
 const nodeIndex=(v:unknown)=>{if(typeof v!=='number'||!Number.isInteger(v)||v<0||v>=(document.nodes as unknown[]).length)throw Error('Invalid GLB node reference');return v;};
 for(const [i,item]of document.nodes.entries()){
  const node=record(item);if(node.children!==undefined){if(!Array.isArray(node.children)||node.children.length>64)throw Error('Invalid GLB children');for(const v of node.children){const child=nodeIndex(v);if(child===i||parent.has(child))throw Error('Invalid GLB tree');parent.set(child,i);}}
 }
 const roots=new Set<number>();for(const v of scene.nodes){const root=nodeIndex(v);if(roots.has(root)||parent.has(root))throw Error('Invalid GLB scene tree');roots.add(root);}
 const seenNodes=new Set<number>(),active=new Set<number>();
 const visitNode=(id:number)=>{if(active.has(id))throw Error('Cyclic GLB nodes');if(seenNodes.has(id))return;active.add(id);const node=record((document.nodes as unknown[])[id]);for(const v of (node.children??[]) as unknown[])visitNode(nodeIndex(v));active.delete(id);seenNodes.add(id);};
 for(const root of roots)visitNode(root);if(seenNodes.size!==document.nodes.length)throw Error('Unreachable or cyclic GLB nodes');
 let triangles=0;
 for(const item of document.meshes){const m=record(item);if(!Array.isArray(m.primitives)||m.primitives.length!==1)throw Error('Each character part requires one triangle primitive');
  const primitive=record(m.primitives[0]);if(primitive.mode!==undefined&&primitive.mode!==4||primitive.targets!==undefined)throw Error('Unsupported character primitive');
  const attrs=record(primitive.attributes);for(const [key,type]of [['POSITION','VEC3'],['NORMAL','VEC3'],['TEXCOORD_0','VEC2']]){
   const id=attrs[key];if(typeof id!=='number'||!Number.isInteger(id)||id<0||id>=document.accessors.length)throw Error('Missing GLB surface accessor');
   const a=record(document.accessors[id]);if(a.type!==type||a.componentType!==5126)throw Error('Unsupported GLB surface format');
  }
  if(record(document.accessors[attrs.POSITION as number]).count!==record(document.accessors[attrs.NORMAL as number]).count||record(document.accessors[attrs.POSITION as number]).count!==record(document.accessors[attrs.TEXCOORD_0 as number]).count)throw Error('GLB surface corner counts differ');
  const accessorIndex=primitive.indices??attrs.POSITION;if(typeof accessorIndex!=='number'||!Number.isInteger(accessorIndex)||accessorIndex<0||accessorIndex>=document.accessors.length)throw Error('Invalid GLB triangle accessor');
  const accessor=record(document.accessors[accessorIndex]);if(primitive.indices!==undefined&&(accessor.type!=='SCALAR'||![5121,5123,5125].includes(accessor.componentType as number)))throw Error('Invalid GLB index format');if(typeof accessor.count!=='number'||!Number.isInteger(accessor.count)||accessor.count<3||accessor.count%3!==0)throw Error('Invalid GLB triangle count');
  triangles+=accessor.count/3;if(triangles>850)throw Error('GLB exceeds 850 declared triangles');
 }
 return {document,bytes:bytes.byteLength,declaredTriangles:triangles,images};
}
/** Ownership is explicit: caller disposes a successful asset, parser disposes
 * resources on validation failure. Never mutates the user's gameplay world. */
export function disposeCharacterModel(scene:Group){const resources=new CharacterResources();resources.track(scene);resources.dispose();scene.clear();}
export interface AssetDecodeOptions {timeoutMs?:number}
export async function parseCharacterGlb(bytes:ArrayBuffer,metadata:unknown,options:AssetDecodeOptions={}){
 const validatedMetadata=validateCharacterRestPose(metadata);
 return parseOwnedRigidGlb(bytes,scene=>validateCharacterModel(scene,validatedMetadata),options);
}
/** Shared owned decoder for the fixed 11-mesh, <=850-triangle embedded asset
 * policy. Each caller supplies its own name/transform/surface validation. */
export async function parseOwnedRigidGlb<T>(bytes:ArrayBuffer,validateScene:(scene:Group)=>T,options:AssetDecodeOptions={}){
 const deadline=new AssetDeadline(options.timeoutMs);
 // Keep the inspected bytes stable across awaits: callers cannot swap an image
 // header after preflight while the loader is still decoding its BIN payload.
 if(bytes.byteLength>MAX_CHARACTER_GLB_BYTES)throw Error('Invalid character GLB size');bytes=bytes.slice(0);
 const inspected=inspectCharacterGlb(bytes);
 const { GLTFLoader }=await deadline.run(import('three/addons/loaders/GLTFLoader.js'));
 const resources=new CharacterResources(),tasks=new CharacterTasks(),images=new Map<number,Promise<ImageBitmap>>(),loader=new GLTFLoader();
 const decode=(index:number)=>{
  let pending=images.get(index);if(pending)return pending;
  const header=inspected.images[index];if(!header)throw Error('Missing inspected embedded image');
  pending=tasks.own((async()=>{
   if(typeof createImageBitmap!=='function')throw Error('Character textures require ImageBitmap decoding');
   const image=await createImageBitmap(new Blob([new Uint8Array(bytes,header.offset,header.bytes)],{type:header.mimeType}),{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});
   resources.image(image);
   if(image.width!==header.width||image.height!==header.height)throw Error('Decoded image dimensions disagree with inspected header');return image;
  })(),()=>{});images.set(index,pending);return pending;
 };
 loader.register(parser=>{
  // Instance-local adapters on the pinned loader's declared parser API. Track
  // primitive geometry before mesh/material promises can fail independently.
  const geometries=parser.loadGeometries.bind(parser),materials=parser.loadMaterial.bind(parser),dependency=parser.getDependency.bind(parser),finalMaterial=parser.assignFinalMaterial.bind(parser);
  parser.loadGeometries=(...args)=>tasks.own(geometries(...args),value=>resources.track(value));
  parser.loadMaterial=index=>tasks.own(materials(index),value=>resources.track(value));
  parser.getDependency=(type,index)=>tasks.own(dependency(type,index),value=>resources.track(value));
  parser.assignFinalMaterial=object=>{try{finalMaterial(object);}finally{resources.track(object);}};
  return {name:'HumanthrowerOwnedEmbeddedImages',loadTexture:index=>tasks.own((async()=>{
   const def=parser.json.textures[index],bitmap=await decode(def.source);if(deadline.expired)throw Error('Asset decode deadline expired');
   const texture=new Texture(bitmap);resources.track(texture);texture.needsUpdate=true;texture.flipY=false;texture.name=def.name??'';
   const sampler=parser.json.samplers?.[def.sampler]??{};
   texture.magFilter=sampler.magFilter===9728?NearestFilter:LinearFilter;
   // Restricted low-res asset path: no mipchain is allocated by the importer.
   texture.minFilter=sampler.minFilter===9728?NearestFilter:LinearFilter;texture.generateMipmaps=false;
   const wrap=(value:number)=>value===33071?ClampToEdgeWrapping:value===33648?MirroredRepeatWrapping:RepeatWrapping;
   texture.wrapS=wrap(sampler.wrapS);texture.wrapT=wrap(sampler.wrapT);parser.associations.set(texture,{textures:index});return texture;
  })(),value=>resources.track(value))};
 });
 try{
  const pending=tasks.own(loader.parseAsync(bytes,''),gltf=>{resources.track(gltf.scene);if(deadline.expired)gltf.scene.clear();});
  const gltf=await deadline.run(pending);
  const validation=validateScene(gltf.scene);
  return {scene:gltf.scene,validation,dispose:()=>{resources.dispose();gltf.scene.clear();}};
 }catch(error){
  // A timeout must release the caller immediately, even if an image promise
  // never settles. The disposed owner closes/disposes late resources on arrival.
  if(deadline.expired){resources.dispose();void tasks.settle();}
  else{
   try{await deadline.run(tasks.settle());}catch(cleanupError){resources.dispose();throw cleanupError;}
   resources.dispose();
  }
  throw error;
 }
}

