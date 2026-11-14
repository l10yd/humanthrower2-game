import * as THREE from 'three';
import type { BloodStain } from '../gameplay/GoreSystem';
import type { Part } from '../physics/PhysicsManager';
import { add, cross, dot, mul, normalize, sub, vec } from '../slicing/Math';
import type { ConvexPolyhedron } from '../slicing/ConvexClipper';
/** Clip a flat low-poly decal to the actual survivor hull; no floating circles
 * extending across a kerf or beyond a thin limb. Positions stay body-local. */
export function bloodDecalGeometry(stain:BloodStain,poly:ConvexPolyhedron):THREE.BufferGeometry {
  const n=normalize(stain.normal),u=normalize(cross(Math.abs(n.x)<.9?vec(1,0,0):vec(0,1,0),n)),v=cross(n,u);
  let ring=Array.from({length:12},(_,i)=>{
    const a=stain.angle+i/12*Math.PI*2;return add(stain.position,add(mul(u,Math.cos(a)*stain.size),mul(v,Math.sin(a)*stain.size*.65)));
  });
  for(const face of poly.faces){
    if(!ring.length)break;
    const normal=normalize(cross(sub(face.vertices[1],face.vertices[0]),sub(face.vertices[2],face.vertices[0]))),d=dot(normal,face.vertices[0]);
    const out:typeof ring=[];
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],da=dot(normal,a)-d,db=dot(normal,b)-d;
      if(da<=1e-5)out.push(a);
      if((da<=1e-5)!==(db<=1e-5))out.push(add(a,mul(sub(b,a),da/(da-db))));
    }ring=out;
  }
  const positions:number[]=[];
  for(let i=1;i<ring.length-1;i++)for(const p of [ring[0],ring[i],ring[i+1]]){const q=add(p,mul(n,.003));positions.push(q.x,q.y,q.z);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
export class BloodDecals {
  readonly group=new THREE.Group();
  batching=true;
  readonly batch:THREE.Mesh;
  private batchGeometry=new THREE.BufferGeometry();private capacity=0;private vertices=0;
  private scratch=new THREE.Vector3();
  private entries=new Map<BloodStain,{mesh:THREE.Mesh;poly:ConvexPolyhedron;partId:number;age:number}>();
  private lastBatching=true;
  private fresh=new THREE.Color('#990b20');private dry=new THREE.Color('#3b1115');
  private material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  private color=new THREE.Color();
  constructor(){this.group.name='BloodBodyDecals';this.batch=new THREE.Mesh(this.batchGeometry,this.material);this.batch.name='BatchedBloodBodyDecals';this.batch.frustumCulled=false;this.batch.visible=false;}
  update(stains:BloodStain[],parts:Map<number,Part>,visuals:Map<number,THREE.Mesh>,enabled:boolean){
    const alive=new Set<BloodStain>();this.group.visible=enabled;let dirty=this.lastBatching!==this.batching;this.lastBatching=this.batching;
    for(const s of stains){
      if(s.partId===undefined)continue;const p=parts.get(s.partId),visual=visuals.get(s.partId);if(!p||!visual)continue;alive.add(s);
      let entry=this.entries.get(s);
      if(!entry){
        const mesh=new THREE.Mesh(bloodDecalGeometry(s,p.poly),this.material);this.group.remove(this.batch);this.group.add(mesh);entry={mesh,poly:p.poly,partId:p.id,age:-1};this.entries.set(s,entry);dirty=true;
      }
      if(entry.poly!==p.poly||entry.partId!==p.id){entry.mesh.geometry.dispose();entry.mesh.geometry=bloodDecalGeometry(s,p.poly);entry.poly=p.poly;entry.partId=p.id;entry.age=-1;dirty=true;}
      if(!entry.mesh.position.equals(visual.position)||!entry.mesh.quaternion.equals(visual.quaternion))dirty=true;
      entry.mesh.position.copy(visual.position);entry.mesh.quaternion.copy(visual.quaternion);entry.mesh.updateMatrix();entry.mesh.visible=!this.batching;
      const age=Math.min(30,s.age);
      if(entry.age!==age){
        dirty=true;entry.age=age;this.color.copy(this.fresh).lerp(this.dry,age/30);
        let colors=entry.mesh.geometry.getAttribute('color') as THREE.BufferAttribute|undefined;
        if(!colors){colors=new THREE.BufferAttribute(new Float32Array(entry.mesh.geometry.getAttribute('position').count*3),3);entry.mesh.geometry.setAttribute('color',colors);}
        for(let i=0;i<colors.count;i++)colors.setXYZ(i,this.color.r,this.color.g,this.color.b);colors.needsUpdate=true;
      }
    }
    for(const [s,e]of this.entries)if(!alive.has(s)){this.group.remove(e.mesh);e.mesh.geometry.dispose();this.entries.delete(s);dirty=true;}
    if(dirty)this.syncBatch();if(this.batch.parent!==this.group)this.group.add(this.batch);
  }
  private syncBatch(){
    this.vertices=0;
    if(!this.batching){this.batch.visible=false;return;}
    for(const e of this.entries.values())this.vertices+=e.mesh.geometry.getAttribute('position').count;
    this.batch.visible=this.vertices>0;
    if(this.vertices>this.capacity){
      this.capacity=2**Math.ceil(Math.log2(this.vertices));
      // Replacing the geometry releases old GPU buffers; replacing just its
      // attributes would leave ownership of previously uploaded arrays unclear.
      const previous=this.batchGeometry;this.batchGeometry=new THREE.BufferGeometry();this.batch.geometry=this.batchGeometry;previous.dispose();
      for(const name of ['position','color'])this.batchGeometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(this.capacity*3),3).setUsage(THREE.DynamicDrawUsage));
    }
    if(this.vertices){
      const positions=this.batchGeometry.getAttribute('position') as THREE.BufferAttribute,colors=this.batchGeometry.getAttribute('color') as THREE.BufferAttribute;
      let offset=0;
      for(const {mesh}of this.entries.values()){
        const source=mesh.geometry.getAttribute('position'),color=mesh.geometry.getAttribute('color');
        for(let i=0;i<source.count;i++){
          this.scratch.fromBufferAttribute(source,i).applyMatrix4(mesh.matrix);
          positions.setXYZ(offset,this.scratch.x,this.scratch.y,this.scratch.z);
          colors.setXYZ(offset,color.getX(i),color.getY(i),color.getZ(i));offset++;
        }
      }
      for(const attribute of [positions,colors]){attribute.clearUpdateRanges();attribute.addUpdateRange(0,this.vertices*3);attribute.needsUpdate=true;}
    }
    this.batchGeometry.setDrawRange(0,this.vertices);
  }
  get snapshot(){return {batching:this.batching,stains:this.entries.size,vertices:this.vertices,capacity:this.capacity,drawCalls:this.batching?(this.vertices?1:0):[...this.entries.values()].filter(e=>e.mesh.geometry.getAttribute('position').count>0).length};}
  get count(){return this.entries.size;}
  dispose(){for(const e of this.entries.values())e.mesh.geometry.dispose();this.batchGeometry.dispose();this.material.dispose();this.entries.clear();this.group.clear();this.capacity=this.vertices=0;}
}
