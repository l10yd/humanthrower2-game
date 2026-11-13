import { box,type ConvexPolyhedron } from '../../src/slicing/ConvexClipper';
import { ASSET_LIMBS,ASSET_LINKS,type CharacterMetadata } from '../../src/assets/CharacterMetadata';
import { identity,vec } from '../../src/slicing/Math';
/** Synthetic schema fixture only: overlapping boxes are NOT a shipping rig. */
export function metadataFixture():CharacterMetadata {
 const hull=():ConvexPolyhedron=>{const p=box(1,1,1);p.faces=p.faces.map(f=>({...f,uvs:f.vertices.map(v=>({u:v.x,v:v.y}))}));return p;};
 const masses=[5,22,12,3,2,3,2,8,3.5,8,3.5];
 return {schemaVersion:1,units:'meters',upAxis:'Y',parts:ASSET_LIMBS.map((name,i)=>({name,mass:masses[i],position:vec(),rotation:{...identity},hull:hull()})),joints:ASSET_LINKS.map(([a,b])=>{
  const hinge=b.startsWith('shin')||b.startsWith('forearm');return {a,b,anchorA:vec(),anchorB:vec(),frameA:{...identity},frameB:{...identity},hinge,limits:hinge?[[-1,1]]:[[-1,1],[-1,1],[-1,1]],connector:{a:box(.1,.1,.1),b:box(.1,.1,.1)}};})};
}
