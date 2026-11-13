import { CONFIG } from '../core/Config';
import { RAPIER, type PhysicsManager, type Part } from '../physics/PhysicsManager';
import { shapeBounds } from './QueryBounds';
import { add, identity, mul, vec, type Vec3, type Quat } from '../slicing/Math';
export interface RecoveryVolume {shape:RAPIER.Shape;position:Vec3;rotation:Quat}
/** Explicit arcade reward: move whole connected debris islands out of the rise
 * corridor. No deletion, no severing, no wall/collider exemptions. */
export function ejectRecoveryDebris(physics:PhysicsManager,volumes:RecoveryVolume[],center:Vec3):number {
 const external=[...physics.parts.values()].filter(p=>p.owner==='npc'&&p.body.isDynamic());
 const statics:RAPIER.Collider[]=[];physics.world.forEachCollider(c=>{if(c.isEnabled()&&!c.isSensor()&&!c.parent()?.isDynamic()&&!physics.partForCollider(c)&&!c.parent()?.isKinematic())statics.push(c);});
 const overlaps=(part:Part,delta=vec())=>volumes.some(v=>{const hit=part.collider.shape.contactShape(add(part.body.translation(),delta),part.body.rotation(),v.shape,v.position,v.rotation,CONFIG.forcedRecovery.clearance);return !!hit&&hit.distance<CONFIG.forcedRecovery.clearance;});
 const visited=new Set<number>();let impulse=0;
 for(const part of external){
  if(visited.has(part.id)||!overlaps(part))continue;
  const group=external.filter(p=>physics.connected(part.id,p.id));group.forEach(p=>visited.add(p.id));
  const side=Math.sign(part.body.worldCom().x-center.x)||((part.npcId%2)?1:-1);
  const directions=[vec(side,0,0),vec(-side,0,0),vec(0,1,0),vec(0,0,1),vec(0,0,-1)];
  const originalContacts=group.map(p=>statics.map(c=>c.contactCollider(p.collider,0)?.distance??0));
  let escape:Vec3|null=null,direction:Vec3|null=null;
  search:for(let distance=.2;distance<=CONFIG.arena.height;distance+=.2)for(const axis of directions){
   const delta=mul(axis,distance);
   if(group.some(p=>{const bounds=shapeBounds(p.collider.shape,add(p.body.translation(),delta),p.body.rotation());return !bounds||bounds.min.x<-CONFIG.arena.width/2+.005||bounds.max.x>CONFIG.arena.width/2-.005||bounds.min.z<-CONFIG.arena.depth/2+.005||bounds.max.z>CONFIG.arena.depth/2-.005||bounds.min.y<-.01;}))continue;
   if(group.some(p=>overlaps(p,delta)))continue;
   if(group.some((p,i)=>statics.some((c,j)=>{const hit=c.contactShape(p.collider.shape,add(p.body.translation(),delta),p.body.rotation(),0);return hit&&hit.distance<Math.min(0,originalContacts[i][j])-.002;})))continue;
   escape=delta;direction=axis;break search;
  }
  if(!escape||!direction)continue;
  for(const p of group){
   p.body.setTranslation(add(p.body.translation(),escape),true);
   const velocity=mul(direction,CONFIG.forcedRecovery.ejectSpeed);p.body.setLinvel(velocity,true);
   p.previous={position:{...p.body.translation()},rotation:{...p.body.rotation()}};p.current=p.previous;
   impulse+=p.body.mass()*CONFIG.forcedRecovery.ejectSpeed;
  }
  physics.world.propagateModifiedBodyPositionsToColliders();
 }
 return impulse;
}
export function uprightVolume(shape:RAPIER.Shape,position:Vec3):RecoveryVolume{return {shape,position,rotation:identity};}
