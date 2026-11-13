import { Group,Mesh,MeshBasicMaterial } from 'three';
import { geometry } from '../../src/rendering/RetroRenderer';
import { restPoseFixture } from './CharacterRestFixture';
export function modelFixture(){const metadata=restPoseFixture(),root=new Group(),material=new MeshBasicMaterial();
 for(const p of metadata.parts){const mesh=new Mesh(geometry(p.hull),material);mesh.name=p.name;mesh.position.set(p.position.x,p.position.y,p.position.z);mesh.quaternion.set(p.rotation.x,p.rotation.y,p.rotation.z,p.rotation.w);root.add(mesh);}
 const dispose=()=>{root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});material.dispose();};
 return {metadata,root,dispose};
}
