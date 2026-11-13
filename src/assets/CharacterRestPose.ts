import { convexOverlapDepth } from './ConvexOverlap';
import { quaternionMultiply,relativeTwistAngles } from '../physics/Diagnostics';
import { validateCharacterMetadata,type CharacterMetadata } from './CharacterMetadata';
/** Read-only rest-pose gate. No bodies, joints or gameplay world are allocated
 * and no constraint is disabled in the game. */
export function validateCharacterRestPose(input:unknown):CharacterMetadata {
 const metadata=validateCharacterMetadata(input),byName=new Map(metadata.parts.map(p=>[p.name,p]));
 const neighbors=new Set(metadata.joints.map(j=>[j.a,j.b].sort().join(':')));
 for(const j of metadata.joints){
  const a=byName.get(j.a)!,b=byName.get(j.b)!;
  const qa=quaternionMultiply(a.rotation,j.frameA),qb=quaternionMultiply(b.rotation,j.frameB);
  const cosine=Math.min(1,Math.abs(qa.x*qb.x+qa.y*qb.y+qa.z*qb.z+qa.w*qb.w));
  if(2*Math.acos(cosine)>.01)throw Error(`Rest joint frames disagree: ${j.a}:${j.b}`);
  const angles=relativeTwistAngles(a.rotation,b.rotation,j.frameA,j.frameB);
  j.limits.forEach(([lo,hi],i)=>{if(angles[i]<lo-.001||angles[i]>hi+.001)throw Error(`Rest angle outside joint range: ${j.a}:${j.b}`);});
 }
 for(let i=0;i<metadata.parts.length;i++)for(let j=i+1;j<metadata.parts.length;j++){
  const a=metadata.parts[i],b=metadata.parts[j];if(neighbors.has([a.name,b.name].sort().join(':')))continue;
  if(convexOverlapDepth(a.hull,a.position,a.rotation,b.hull,b.position,b.rotation)>.002)throw Error(`Non-neighbor rest overlap: ${a.name}:${b.name}`);
 }
 return metadata;
}
