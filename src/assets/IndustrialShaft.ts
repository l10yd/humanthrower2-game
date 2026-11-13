import {Box3,Mesh,SkinnedMesh,Texture,Vector3,Quaternion,type Group} from 'three';
import {parseOwnedRigidGlb} from './CharacterGlb';
export const SHAFT_MESHES=['shaft_back','shaft_floor','shaft_left','shaft_right','shaft_rail_left','shaft_rail_right','shaft_header','shaft_vents','shaft_pipes','shaft_lamps','shaft_braces'];
/** Trusted project environment asset, still checked before entering the renderer.
 * No PhysicsManager input: scenery cannot add colliders or alter arena limits. */
export function validateIndustrialShaft(root:Group){
 const names=new Set<string>(),meshes:Mesh[]=[],textures=new Set<Texture>();let triangles=0;
 root.updateMatrixWorld(true);
 root.traverse(o=>{if(o instanceof Mesh){
  if(o instanceof SkinnedMesh||!SHAFT_MESHES.includes(o.name)||names.has(o.name)||Object.keys(o.geometry.morphAttributes).length)throw Error('Invalid shaft mesh');names.add(o.name);meshes.push(o);
  const position=new Vector3(),rotation=new Quaternion(),scale=new Vector3();o.matrixWorld.decompose(position,rotation,scale);
  if(position.length()>1e-5||scale.distanceTo(new Vector3(1,1,1))>1e-5||Math.abs(rotation.w)<.99999)throw Error('Shaft geometry must have baked identity transforms');
  const p=o.geometry.getAttribute('position'),uv=o.geometry.getAttribute('uv'),normal=o.geometry.getAttribute('normal'),index=o.geometry.index;
  if(!p||!uv||!normal||p.count!==uv.count||p.count!==normal.count)throw Error('Missing shaft attributes');
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(!Number.isFinite(x+y+z+uv.getX(i)+uv.getY(i))||Math.abs(x)>4.86||y<-.351||y>11.49||z<-1.58||z>1.56)throw Error('Shaft geometry outside authored arena envelope');
   const nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i);
   if(!Number.isFinite(nx+ny+nz)||Math.abs(Math.hypot(nx,ny,nz)-1)>.01)throw Error('Invalid shaft normals');
   if(['shaft_back','shaft_vents','shaft_pipes'].includes(o.name)&&z> -1.049)throw Error('Rear shaft decor protrudes into gameplay depth');
  }
  const count=index?.count??p.count;if(count%3)throw Error('Invalid shaft triangles');triangles+=count/3;
  if(index)for(let i=0;i<count;i++)if(!Number.isInteger(index.getX(i))||index.getX(i)<0||index.getX(i)>=p.count)throw Error('Invalid shaft index');
  for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v instanceof Texture)textures.add(v);
 }});
 if(names.size!==11||triangles>850||textures.size!==1)throw Error('Shaft budget exceeded');
 const bounds=new Box3().setFromObject(root);
 if(bounds.min.y>-.34||bounds.max.y<11.4||bounds.min.x> -4.8||bounds.max.x<4.8)throw Error('Incomplete shaft envelope');
 return {parts:names.size,triangles,textures:textures.size};
}
export class IndustrialShaft {
 readonly name='industrial-shaft';readonly scene:Group;
 constructor(private asset:Awaited<ReturnType<typeof parseOwnedRigidGlb<ReturnType<typeof validateIndustrialShaft>>>>){this.scene=asset.scene;this.scene.name='IndustrialShaft';}
 get snapshot(){return {name:this.name,...this.asset.validation,physics:'visual-only'};}
 dispose(){this.asset.dispose();}
}
export async function loadIndustrialShaft(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{const response=await fetch(`${import.meta.env.BASE_URL}assets/industrial-shaft/shaft.glb`,{signal:controller.signal});if(!response.ok)throw Error('Shaft asset unavailable');
  const asset=await parseOwnedRigidGlb(await response.arrayBuffer(),validateIndustrialShaft);return new IndustrialShaft(asset);
 }finally{clearTimeout(timer);}
}
