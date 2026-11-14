import * as THREE from 'three';
const transformShader=`
attribute vec4 partTransform0,partTransform1,partTransform2,partTransform3;
#define instanceMatrix mat4(partTransform0,partTransform1,partTransform2,partTransform3)
#define USE_INSTANCING
`;
/** Per-vertex transforms let different exact hulls share a draw call. The source
 * positions remain local, including PS1 jitter/UVs. No baked-world quantization. */
export function partTransformMaterial(source:THREE.Material):THREE.Material {
 const material=source instanceof THREE.ShaderMaterial?new THREE.ShaderMaterial():source.clone(),compile=source.onBeforeCompile;
 if(source instanceof THREE.ShaderMaterial&&material instanceof THREE.ShaderMaterial){
  THREE.Material.prototype.copy.call(material,source);
  material.vertexShader=source.vertexShader;material.fragmentShader=source.fragmentShader;material.uniforms=source.uniforms;
  material.defines={...source.defines};material.extensions={...source.extensions};material.glslVersion=source.glslVersion;material.lights=source.lights;material.clipping=source.clipping;
 }
 material.onBeforeCompile=(shader,renderer)=>{compile.call(material,shader,renderer);shader.vertexShader=transformShader+shader.vertexShader;};
 material.customProgramCacheKey=()=>source.customProgramCacheKey()+':exact-part-transforms-v1';
 if(source instanceof THREE.ShaderMaterial&&material instanceof THREE.ShaderMaterial)material.uniforms=source.uniforms;
 return material;
}
interface Merged {mesh:THREE.Mesh;sources:THREE.Mesh[];geometries:THREE.BufferGeometry[];matrices:Float32Array[];offsets:number[];counts:number[];material:THREE.Material}
/** Exact baked-geometry + material groups. Duplicate hulls use instancing;
 * unique fragments share an indexed draw buffer with per-vertex world matrices.
 * Source meshes stay available to decals and the diagnostic unbatched path. */
export class PartBatches {
 readonly group=new THREE.Group();enabled=true;
 private batches=new Map<string,THREE.InstancedMesh>();private merged=new Map<string,Merged>();
 private keys=new WeakMap<THREE.BufferGeometry,string>();private hidden:THREE.Mesh[]=[];
 private instances=0;private represented=0;private unique=0;private uploads=0;
 constructor(){this.group.name='PartBatches';}
 begin(){for(const mesh of this.hidden)mesh.visible=true;this.hidden=[];}
 private key(geometry:THREE.BufferGeometry){
  let key=this.keys.get(geometry);if(key!==undefined)return key;
  key=JSON.stringify({index:geometry.index?Array.from(geometry.index.array):null,attributes:Object.entries(geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,a])=>[name,a.itemSize,a.normalized,Array.from(a.array)])});
  this.keys.set(geometry,key);return key;
 }
 private eligible(mesh:THREE.Mesh){
  const material=mesh.material,g=mesh.geometry;
  return !Array.isArray(material)&&!material.transparent&&!g.groups.length&&g.drawRange.start===0&&g.drawRange.count===Infinity
   &&!('isSkinnedMesh' in mesh)&&!(mesh instanceof THREE.InstancedMesh)&&Object.keys(g.morphAttributes).length===0&&Object.values(g.attributes).every(a=>a instanceof THREE.BufferAttribute&&!a.normalized&&a.array instanceof Float32Array);
 }
 private sourceKey(mesh:THREE.Mesh){return `${(mesh.material as THREE.Material).uuid}:${mesh.castShadow}:${mesh.receiveShadow}:${mesh.renderOrder}:${mesh.layers.mask}`;}
 sync(source:readonly THREE.Mesh[]){
  this.instances=this.unique=this.uploads=0;this.represented=source.length;
  if(!this.enabled){this.clear();return;}
  const groups=new Map<string,THREE.Mesh[]>();
  for(const mesh of source){if(!mesh.visible||!this.eligible(mesh))continue;
   const key=`${this.sourceKey(mesh)}:${this.key(mesh.geometry)}`,list=groups.get(key)??[];list.push(mesh);groups.set(key,list);
  }
  const alive=new Set<string>(),leftovers=new Map<string,THREE.Mesh[]>();
  for(const [key,meshes]of groups){
   if(meshes.length<2){const mesh=meshes[0],layout=Object.entries(mesh.geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([n,a])=>`${n}:${a.itemSize}`).join(',');
    const mergeKey=`${this.sourceKey(mesh)}:${layout}`,list=leftovers.get(mergeKey)??[];list.push(mesh);leftovers.set(mergeKey,list);continue;}
   alive.add(key);let batch=this.batches.get(key);
   if(batch&&batch.instanceMatrix.count<meshes.length){this.group.remove(batch);batch.dispose();this.batches.delete(key);batch=undefined;}
   if(!batch){batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,2**Math.ceil(Math.log2(meshes.length)));batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.frustumCulled=false;batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;batch.renderOrder=meshes[0].renderOrder;batch.layers.mask=meshes[0].layers.mask;batch.name='InstancedParts';this.batches.set(key,batch);this.group.add(batch);}
   batch.geometry=meshes[0].geometry;batch.material=meshes[0].material;batch.count=meshes.length;
   for(let i=0;i<meshes.length;i++){const mesh=meshes[i];batch.setMatrixAt(i,mesh.matrixWorld);mesh.visible=false;this.hidden.push(mesh);}
   batch.instanceMatrix.needsUpdate=true;this.instances+=meshes.length;
  }
  for(const [key,batch]of this.batches)if(!alive.has(key)){this.group.remove(batch);batch.dispose();this.batches.delete(key);}
  const mergedAlive=new Set<string>();
  for(const [key,meshes]of leftovers){if(meshes.length<2)continue;mergedAlive.add(key);let entry=this.merged.get(key);
   if(entry&&(entry.sources.length!==meshes.length||meshes.some((m,i)=>entry!.sources[i]!==m||entry!.geometries[i]!==m.geometry))){this.removeMerged(key,entry);entry=undefined;}
   if(!entry){entry=this.createMerged(meshes);this.merged.set(key,entry);this.group.add(entry.mesh);}
   const attributes=[0,1,2,3].map(i=>entry!.mesh.geometry.getAttribute(`partTransform${i}`) as THREE.BufferAttribute);let dirty=false;
   for(let i=0;i<meshes.length;i++){
    const mesh=meshes[i],matrix=mesh.matrixWorld.elements,last=entry.matrices[i];
    if(matrix.some((v,j)=>Math.fround(v)!==last[j])){
     for(let column=0;column<4;column++){const attribute=attributes[column];for(let vertex=entry.offsets[i];vertex<entry.offsets[i]+entry.counts[i];vertex++)attribute.setXYZW(vertex,matrix[column*4],matrix[column*4+1],matrix[column*4+2],matrix[column*4+3]);attribute.addUpdateRange(entry.offsets[i]*4,entry.counts[i]*4);}
     last.set(matrix);dirty=true;
    }
    mesh.visible=false;this.hidden.push(mesh);
   }
   if(dirty){for(const a of attributes)a.needsUpdate=true;this.uploads++;}
   this.unique+=meshes.length;
  }
  for(const [key,entry]of this.merged)if(!mergedAlive.has(key))this.removeMerged(key,entry);
 }
 private createMerged(sources:THREE.Mesh[]):Merged {
  const offsets:number[]=[],counts=sources.map(m=>m.geometry.getAttribute('position').count);let vertices=0;for(const n of counts){offsets.push(vertices);vertices+=n;}
  const geometry=new THREE.BufferGeometry();
  for(const [name,source]of Object.entries(sources[0].geometry.attributes)){
   const array=new Float32Array(vertices*source.itemSize);sources.forEach((m,i)=>array.set(m.geometry.getAttribute(name).array,offsets[i]*source.itemSize));geometry.setAttribute(name,new THREE.BufferAttribute(array,source.itemSize));
  }
  const indices:number[]=[];sources.forEach((m,i)=>{const index=m.geometry.index;for(let j=0;j<(index?.count??counts[i]);j++)indices.push(offsets[i]+(index?index.getX(j):j));});geometry.setIndex(indices);
  for(let i=0;i<4;i++)geometry.setAttribute(`partTransform${i}`,new THREE.BufferAttribute(new Float32Array(vertices*4),4).setUsage(THREE.DynamicDrawUsage));
  const material=partTransformMaterial(sources[0].material as THREE.Material),mesh=new THREE.Mesh(geometry,material);
  mesh.name='MergedUniqueParts';mesh.userData.partTransforms=true;mesh.userData.partCount=sources.length;mesh.frustumCulled=false;mesh.castShadow=sources[0].castShadow;mesh.receiveShadow=sources[0].receiveShadow;mesh.renderOrder=sources[0].renderOrder;mesh.layers.mask=sources[0].layers.mask;
  return {mesh,material,sources:[...sources],geometries:sources.map(m=>m.geometry),matrices:sources.map(()=>new Float32Array(16).fill(NaN)),offsets,counts};
 }
 private removeMerged(key:string,entry:Merged){this.group.remove(entry.mesh);entry.mesh.geometry.dispose();entry.material.dispose();this.merged.delete(key);}
 private clear(){for(const b of this.batches.values()){this.group.remove(b);b.dispose();}this.batches.clear();for(const [key,e]of this.merged)this.removeMerged(key,e);}
 get snapshot(){return {enabled:this.enabled,groups:this.batches.size+this.merged.size,instances:this.instances,unique:this.unique,represented:this.represented,transformUploads:this.uploads};}
 dispose(){this.begin();this.clear();this.keys=new WeakMap();}
}
