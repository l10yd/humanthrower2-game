import { BufferGeometry,Material,Mesh,Object3D,Texture } from 'three';
/** One parse attempt owns everything it creates, including resources resolving
 * after a sibling promise rejects. No global Three caches or prototype patches. */
export class CharacterResources {
 private geometries=new Set<BufferGeometry>();private materials=new Set<Material>();private textures=new Set<Texture>();private images=new Set<{close:()=>void}>();private seen=new WeakSet<object>();private seenImages=new WeakSet<object>();private disposed=false;
 track(value:unknown){
  if(Array.isArray(value)){for(const v of value)this.track(v);return;}
  if(value instanceof Material)for(const v of Object.values(value))if(v instanceof Texture)this.track(v);
  if(value instanceof BufferGeometry||value instanceof Material||value instanceof Texture){if(this.seen.has(value))return;this.seen.add(value);}
  if(value instanceof BufferGeometry){if(this.disposed)value.dispose();else this.geometries.add(value);}
  else if(value instanceof Material){if(this.disposed)value.dispose();else this.materials.add(value);}
  else if(value instanceof Texture){const image=value.image as {close?:()=>void}|null;if(image&&typeof image.close==='function')this.image(image as {close:()=>void});if(this.disposed)value.dispose();else this.textures.add(value);}
  else if(value instanceof Object3D)value.traverse(o=>{if(o instanceof Mesh){this.track(o.geometry);this.track(o.material);}});
 }
 image(image:{close:()=>void}){if(this.seenImages.has(image))return;this.seenImages.add(image);if(this.disposed)image.close();else this.images.add(image);}
 dispose(){if(this.disposed)return;this.disposed=true;
  for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();for(const i of this.images)i.close();
  this.geometries.clear();this.materials.clear();this.textures.clear();this.images.clear();
 }
}
/** Track spawned dependencies, draining late completions before disposing. */
export class CharacterTasks {
 private pending=new Set<Promise<unknown>>();
 own<T>(promise:Promise<T>,onValue:(value:T)=>void){const task=promise.then(value=>{onValue(value);return value;});this.pending.add(task);void task.then(()=>this.pending.delete(task),()=>this.pending.delete(task));return task;}
 async settle(){while(this.pending.size)await Promise.allSettled([...this.pending]);}
}
