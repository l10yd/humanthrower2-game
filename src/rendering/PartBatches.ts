import * as THREE from 'three';
/** Exact baked-geometry + material groups. No topology simplification, physics
 * culling or pose quantization: instances copy each source mesh's world matrix.
 * Source meshes remain available to decals and the unbatched diagnostic path. */
export class PartBatches {
 readonly group=new THREE.Group();enabled=true;
 private batches=new Map<string,THREE.InstancedMesh>();
 private keys=new WeakMap<THREE.BufferGeometry,string>();private hidden:THREE.Mesh[]=[];
 private instances=0;private represented=0;
 constructor(){this.group.name='PartBatches';}
 begin(){for(const mesh of this.hidden)mesh.visible=true;this.hidden=[];}
 private key(geometry:THREE.BufferGeometry){
  let key=this.keys.get(geometry);if(key!==undefined)return key;
  // Collision-free key, computed only when a new geometry is first seen.
  key=JSON.stringify({index:geometry.index?Array.from(geometry.index.array):null,attributes:Object.entries(geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,a])=>[name,a.itemSize,a.normalized,Array.from(a.array)])});
  this.keys.set(geometry,key);return key;
 }
 sync(source:readonly THREE.Mesh[]){
  this.instances=0;this.represented=source.length;
  if(!this.enabled){this.clear();return;}
  const groups=new Map<string,THREE.Mesh[]>();
  for(const mesh of source){if(!mesh.visible)continue;const material=mesh.material;
   if(Array.isArray(material)||material.transparent||mesh.geometry.groups.length)continue;
   const key=`${material.uuid}:${this.key(mesh.geometry)}`,list=groups.get(key)??[];list.push(mesh);groups.set(key,list);
  }
  const alive=new Set<string>();
  for(const [key,meshes]of groups){if(meshes.length<2)continue;alive.add(key);let batch=this.batches.get(key);
   if(batch&&batch.instanceMatrix.count<meshes.length){this.group.remove(batch);batch.dispose();this.batches.delete(key);batch=undefined;}
   if(!batch){batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,2**Math.ceil(Math.log2(meshes.length)));batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.frustumCulled=false;batch.castShadow=true;batch.name='InstancedParts';this.batches.set(key,batch);this.group.add(batch);}
   batch.geometry=meshes[0].geometry;batch.material=meshes[0].material;batch.count=meshes.length;
   for(let i=0;i<meshes.length;i++){const mesh=meshes[i];batch.setMatrixAt(i,mesh.matrixWorld);mesh.visible=false;this.hidden.push(mesh);}
   batch.instanceMatrix.needsUpdate=true;this.instances+=meshes.length;
  }
  for(const [key,batch]of this.batches)if(!alive.has(key)){this.group.remove(batch);batch.dispose();this.batches.delete(key);}
 }
 private clear(){for(const b of this.batches.values()){this.group.remove(b);b.dispose();}this.batches.clear();}
 get snapshot(){return {enabled:this.enabled,groups:this.batches.size,instances:this.instances,represented:this.represented};}
 dispose(){this.begin();this.clear();this.keys=new WeakMap();}
}
