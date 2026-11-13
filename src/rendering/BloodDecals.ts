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
  private entries=new Map<BloodStain,{mesh:THREE.Mesh;poly:ConvexPolyhedron;partId:number}>();
  private fresh=new THREE.Color('#990b20');private dry=new THREE.Color('#3b1115');
  constructor(){this.group.name='BloodBodyDecals';}
  update(stains:BloodStain[],parts:Map<number,Part>,visuals:Map<number,THREE.Mesh>,enabled:boolean){
    const alive=new Set<BloodStain>();this.group.visible=enabled;
    for(const s of stains){
      if(s.partId===undefined)continue;const p=parts.get(s.partId),visual=visuals.get(s.partId);if(!p||!visual)continue;alive.add(s);
      let entry=this.entries.get(s);
      if(!entry){
        const material=new THREE.MeshBasicMaterial({color:this.fresh,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
        const mesh=new THREE.Mesh(bloodDecalGeometry(s,p.poly),material);this.group.add(mesh);entry={mesh,poly:p.poly,partId:p.id};this.entries.set(s,entry);
      }
      if(entry.poly!==p.poly||entry.partId!==p.id){entry.mesh.geometry.dispose();entry.mesh.geometry=bloodDecalGeometry(s,p.poly);entry.poly=p.poly;entry.partId=p.id;}
      entry.mesh.position.copy(visual.position);entry.mesh.quaternion.copy(visual.quaternion);
      (entry.mesh.material as THREE.MeshBasicMaterial).color.copy(this.fresh).lerp(this.dry,Math.min(1,s.age/30));
    }
    for(const [s,e]of this.entries)if(!alive.has(s)){this.group.remove(e.mesh);e.mesh.geometry.dispose();(e.mesh.material as THREE.Material).dispose();this.entries.delete(s);}
  }
  get count(){return this.entries.size;}
  dispose(){for(const e of this.entries.values()){e.mesh.geometry.dispose();(e.mesh.material as THREE.Material).dispose();}this.entries.clear();this.group.clear();}
}
