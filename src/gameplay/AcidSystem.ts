import {CONFIG} from '../core/Config';
import type {ChaosEvent} from './ChaosDirector';
import type {PhysicsManager} from '../physics/PhysicsManager';
import type {PlayerController} from '../player/PlayerController';
import {shapeBounds} from '../player/QueryBounds';
import {add,identity} from '../slicing/Math';

/** Explicit gameplay hazard, not hidden performance culling. Only acid-exposed
 * parts dissolve; geometry above the pool is kept until contact. No fragment spawns. */
export class AcidSystem {
 level=0;dissolved=0;removedMass=0;private exposure=new Map<number,number>();private nextMeasure=0;private previousTime:number|null=null;
 static height(event:ChaosEvent|null,now:number){
  if(event?.kind!=='acid'||!event.started||now<event.startsAt||now>=event.endsAt)return 0;
  const elapsed=now-event.startsAt,remaining=event.endsAt-now;
  return CONFIG.acid.maxHeight*Math.min(1,elapsed/CONFIG.acid.riseSeconds,remaining/CONFIG.acid.drainSeconds);
 }
 update(physics:PhysicsManager,player:PlayerController,event:ChaosEvent|null,now:number,damagePlayer=true){
  this.level=AcidSystem.height(event,now);
  if(!this.level){this.exposure.clear();this.previousTime=null;this.nextMeasure=now;return;}
  if(now+1e-8<this.nextMeasure)return;
  const dt=this.previousTime===null?CONFIG.dt:Math.max(0,Math.min(.2,now-this.previousTime));this.previousTime=now;this.nextMeasure=now+.1;
  const livePlayer=new Set(player.ragdoll.parts.map(p=>p.id)),alive=new Set<number>(),wake=new Set<number>();let removed=0;
  for(const part of [...physics.parts.values()]){
   if(part.owner==='player'&&!player.ragdoll.dead&&livePlayer.has(part.id))continue;
   const bounds=shapeBounds(part.collider.shape,part.body.translation(),part.body.rotation());if(!bounds)continue;
   const submerged=Math.max(0,Math.min(1,(this.level-bounds.min.y)/Math.max(.03,bounds.max.y-bounds.min.y)));
   if(!submerged)continue;alive.add(part.id);
   const exposure=(this.exposure.get(part.id)??0)+dt*(.3+.7*submerged);this.exposure.set(part.id,exposure);
   if(exposure<CONFIG.acid.dissolveSeconds)continue;
   // Removal of a support must wake its surviving joints/contact neighbours.
   for(const p of physics.connectedParts(part.id))if(p.id!==part.id)wake.add(p.id);
   physics.world.contactPairsWith(part.collider,c=>{const p=physics.partForCollider(c);if(p)wake.add(p.id);});
   this.removedMass+=part.body.mass();physics.removePart(part.id);this.exposure.delete(part.id);this.dissolved++;removed++;
  }
  for(const id of this.exposure.keys())if(!alive.has(id)||!physics.parts.has(id))this.exposure.delete(id);
  if(removed){for(const id of wake)physics.parts.get(id)?.body.wakeUp();physics.world.propagateModifiedBodyPositionsToColliders();}
  if(damagePlayer&&!player.ragdoll.dead){
   const poses=player.ragdoll.down?player.ragdoll.parts.map(p=>({limb:p.limb,bounds:shapeBounds(p.collider.shape,p.body.translation(),p.body.rotation())})):
    player.ragdoll.standingParts.filter(p=>player.damage.has(p.name)).map(p=>({limb:p.name,bounds:shapeBounds(p.queryShape,add(player.current,p.position),identity)}));
   for(const {limb,bounds}of poses){
    if(!bounds||bounds.min.y>=this.level)continue;
    const key=limb as keyof typeof player.damage.parts;if(!(key in player.damage.parts)||key==='head'&&player.damage.headImmune)continue;
    const amount=Math.min(1,(this.level-bounds.min.y)/Math.max(.03,bounds.max.y-bounds.min.y));
    player.damage.parts[key]=Math.max(0,player.damage.parts[key]-dt*CONFIG.acid.playerDamagePerSecond*amount);
   }
  }
 }
 reset(){this.level=this.dissolved=this.removedMass=0;this.exposure.clear();this.nextMeasure=0;this.previousTime=null;}
 get snapshot(){return {level:this.level,dissolved:this.dissolved,removedMass:this.removedMass,exposed:this.exposure.size};}
}
