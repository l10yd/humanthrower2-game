import type { Part,PhysicsManager } from '../physics/PhysicsManager';
/** Solver reaction, not an anatomical mass estimate. Impact, friction and active
 * recovery forces can make kg-equivalent exceed the physical mass temporarily. */
export interface ContactLoad {downwardImpulse:number;upwardImpulse:number;equivalentMass:number;solvedContacts:number;stalePairs:number}
/** Average impulses over the sampled solver substeps, not over render frames.
 * Partial sleeping data remains explicitly marked and is not a gameplay fallback. */
export class ContactLoadWindow {
 private duration=0;private down=0;private up=0;private contacts=0;private stale=0;
 reset(){this.duration=this.down=this.up=this.contacts=this.stale=0;}
 sample(physics:PhysicsManager,parts:readonly Part[],dt:number){
  const load=contactLoad(physics,parts,dt);
  this.duration+=dt;this.down+=load.downwardImpulse;this.up+=load.upwardImpulse;this.contacts+=load.solvedContacts;this.stale+=load.stalePairs;
 }
 get snapshot(){return {duration:this.duration,downwardImpulse:this.down,upwardImpulse:this.up,equivalentMass:this.duration?this.down/(9.81*this.duration):0,solvedContacts:this.contacts,stalePairs:this.stale,complete:this.duration>0&&this.stale===0};}
}
export function contactLoad(physics:PhysicsManager,playerParts:readonly Part[],dt:number):ContactLoad {
 if(!Number.isFinite(dt)||dt<=0)throw Error('Contact-load timestep must be positive');
 const ids=new Set(playerParts.map(p=>p.id)),seen=new Set<string>();
 let downwardImpulse=0,upwardImpulse=0,solvedContacts=0,stalePairs=0;
 for(const part of playerParts){
  // Structural cuts can invalidate a caller's old part list. Never read freed handles.
  if(physics.parts.get(part.id)!==part||!part.collider.isEnabled()||part.collider.isSensor())continue;
  physics.world.contactPairsWith(part.collider,other=>{
   const npc=physics.partForCollider(other);if(!npc||npc.owner!=='npc'||ids.has(npc.id)||!other.isEnabled()||other.isSensor())return;
   const key=`${part.id}:${npc.id}`;if(seen.has(key))return;seen.add(key);
   // Sleeping pairs retain old solver impulses, which are NOT a fresh force
   // measurement for this substep. Report unavailable samples explicitly.
   if((!part.body.isDynamic()||part.body.isSleeping())&&npc.body.isSleeping()){stalePairs++;return;}
   physics.world.contactPair(part.collider,other,(manifold,flipped)=>{
    const normal={...manifold.normal()},vertical=normal.y*(flipped?-1:1);
    for(let i=0;i<manifold.numContacts();i++){
     const impulse=manifold.contactImpulse(i);if(!Number.isFinite(impulse)||impulse<=0)continue;
     if(vertical>.25){downwardImpulse+=impulse*vertical;solvedContacts++;}
     else if(vertical<-.25){upwardImpulse-=impulse*vertical;solvedContacts++;}
    }
   });
  });
 }
 return {downwardImpulse,upwardImpulse,equivalentMass:downwardImpulse/(9.81*dt),solvedContacts,stalePairs};
}
