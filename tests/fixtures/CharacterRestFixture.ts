import { metadataFixture } from './CharacterMetadataFixture';
import { box,vertices,type ConvexPolyhedron } from '../../src/slicing/ConvexClipper';
import { vec,sub,mul } from '../../src/slicing/Math';
/** Tiny branched box rig for validation only, not a human art asset. */
export function restPoseFixture(){
 const data=metadataFixture();
 const positions:Record<string,ReturnType<typeof vec>>={chest:vec(0,1,0),head:vec(0,1.2,0),pelvis:vec(0,.8,0),'upperArm-1':vec(-.2,1,0),'forearm-1':vec(-.4,1,0),upperArm1:vec(.2,1,0),forearm1:vec(.4,1,0),'thigh-1':vec(-.2,.8,0),'shin-1':vec(-.4,.8,0),thigh1:vec(.2,.8,0),shin1:vec(.4,.8,0)};
 for(const p of data.parts){p.position=positions[p.name];p.hull=box(.1,.1,.1);p.hull.faces=p.hull.faces.map(f=>({...f,uvs:f.vertices.map(v=>({u:v.x,v:v.y}))}));}
 const shifted=(center:ReturnType<typeof vec>):ConvexPolyhedron=>{const p=box(.02,.02,.02);for(const v of vertices(p)){v.x+=center.x;v.y+=center.y;v.z+=center.z;}return p;};
 for(const j of data.joints){const delta=sub(positions[j.b],positions[j.a]);j.anchorA=mul(delta,.5);j.anchorB=mul(delta,-.5);j.connector={a:shifted(mul(delta,.4)),b:shifted(mul(delta,-.4))};}
 return data;
}
