import type { Part, PhysicsManager } from '../physics/PhysicsManager';
import { length } from '../slicing/Math';
export interface LoadSnapshot {mass:number;npcCount:number;requiredRate:number;mobility:number}
export function loadEffort(mass:number,pressRate:number,loadScale=1):LoadSnapshot {
 const equivalent=Math.max(0,mass)/(72*loadScale),requiredRate=(2+equivalent*3)/loadScale;
 const drive=equivalent<.1?1:Math.min(1,Math.max(0,pressRate)/requiredRate);
 const ramp=equivalent<=2?1-equivalent*.3:.4*Math.exp(-3.28*(equivalent-2));
 const capacity=Math.max(.0005,ramp);
 return {mass:Math.max(0,mass),npcCount:equivalent,requiredRate,mobility:capacity*(equivalent<.1?1:.08+.92*drive)};
}
/** Directed real-support graph. Includes whole connected ragdolls once, not every part
 * once per player contact. Spatial closeness or merely being higher is never enough. */
export function pileLoad(physics:PhysicsManager,playerParts:Part[],massOf:(part:Part)=>number=part=>part.body.mass()):number {
 const visited=new Set<number>(playerParts.map(p=>p.id)),queue=[...playerParts];let mass=0;
 for(let index=0;index<queue.length;index++){
  const support=queue[index];
  physics.world.contactPairsWith(support.collider,c=>{
   const upper=physics.partForCollider(c);if(!upper||upper.owner!=='npc'||visited.has(upper.id))return;
   if(length({...upper.body.linvel()})>1.2)return;
   const contact=support.collider.contactCollider(c,.035);
   if(!contact||contact.distance>.035||contact.normal1.y<.25)return;
   for(const part of physics.parts.values())if(part.owner==='npc'&&physics.connected(part.id,upper.id)&&!visited.has(part.id)){
    visited.add(part.id);queue.push(part);mass+=massOf(part);
   }
  });
 }
 return mass;
}
