import { CONFIG } from '../core/Config';
import { RAPIER, type PhysicsManager, type Part } from '../physics/PhysicsManager';
import { shapeBounds, overlaps, type Bounds } from './QueryBounds';
import { add, identity, mul, vec, type Vec3, type Quat } from '../slicing/Math';
export interface RecoveryVolume {shape:RAPIER.Shape;position:Vec3;rotation:Quat}
interface DebrisPose {part:Part;shape:RAPIER.Shape;position:Vec3;rotation:Quat;bounds:Bounds|null}
const shifted=(b:Bounds,delta:Vec3):Bounds=>({min:add(b.min,delta),max:add(b.max,delta)});
/** Explicit arcade reward: rigidly translate whole connected debris islands out
 * of the rise corridor. This is destination clearance, not a physical path sweep.
 * No deletion, severing, wall exemption or change to mass/joints. */
export function ejectRecoveryDebris(physics:PhysicsManager,volumes:RecoveryVolume[],center:Vec3):number {
 const metrics=physics.recoveryQueries;
 metrics.scannedParts=metrics.candidateParts=metrics.narrowTests=metrics.searchCandidates=metrics.movedIslands=0;
 if(!volumes.length)return 0;
 const clearance=CONFIG.forcedRecovery.clearance;
 const targets=volumes.map(volume=>({...volume,bounds:shapeBounds(volume.shape,volume.position,volume.rotation)}));
 const statics:{collider:RAPIER.Collider;bounds:Bounds|null}[]=[];
 physics.world.forEachCollider(c=>{
  if(c.isEnabled()&&!c.isSensor()&&!c.parent()?.isDynamic()&&!physics.partForCollider(c)&&!c.parent()?.isKinematic())
   statics.push({collider:c,bounds:shapeBounds(c.shape,c.translation(),c.rotation())});
 });
 // One pose/shape read per relevant part. Exact WASM contacts only follow cheap
 // AABB rejection. Poses cannot be reused across a world edit or solver step.
 const poses=new Map<number,DebrisPose>();
 const poseFor=(part:Part)=>{
  let pose=poses.get(part.id);if(pose)return pose;
  const shape=part.collider.shape,position={...part.body.translation()},rotation={...part.body.rotation()};
  pose={part,shape,position,rotation,bounds:shapeBounds(shape,position,rotation)};poses.set(part.id,pose);return pose;
 };
 const intersects=(pose:DebrisPose,delta:Vec3)=>{
  const bounds=pose.bounds&&shifted(pose.bounds,delta);
  for(const v of targets){
   if(bounds&&v.bounds&&!overlaps(bounds,v.bounds,clearance))continue;
   metrics.narrowTests++;
   const hit=pose.shape.contactShape(add(pose.position,delta),pose.rotation,v.shape,v.position,v.rotation,clearance);
   if(hit&&hit.distance<clearance)return true;
  }
  return false;
 };
 const visited=new Set<number>();let impulse=0;
 for(const part of physics.parts.values()){
  if(part.owner!=='npc'||!part.body.isDynamic())continue;
  metrics.scannedParts++;
  if(visited.has(part.id))continue;
  const pose=poseFor(part);
  if(pose.bounds&&targets.every(v=>v.bounds&&!overlaps(pose.bounds!,v.bounds,clearance)))continue;
  metrics.candidateParts++;
  if(!intersects(pose,vec()))continue;
  const group=physics.connectedParts(part.id).filter(p=>p.owner==='npc'&&p.body.isDynamic()).map(poseFor);
  for(const member of group)visited.add(member.part.id);
  const side=Math.sign(part.body.worldCom().x-center.x)||((part.npcId%2)?1:-1);
  const directions=[vec(side,0,0),vec(-side,0,0),vec(0,1,0),vec(0,0,1),vec(0,0,-1)];
  const originalContacts=group.map(p=>statics.map(c=>{
   if(p.bounds&&c.bounds&&!overlaps(p.bounds,c.bounds,0))return 0;
   metrics.narrowTests++;return c.collider.contactCollider(p.part.collider,0)?.distance??0;
  }));
  let escape:Vec3|null=null,direction:Vec3|null=null;
  // Preserve deterministic candidate order. Work is geometry-dependent, never
  // limited by wall-clock time (which would make recovery hardware-dependent).
  search:for(let distance=.2;distance<=CONFIG.arena.height;distance+=.2)for(const axis of directions){
   metrics.searchCandidates++;const delta=mul(axis,distance);
   if(group.some(p=>{
    if(!p.bounds)return true;const b=shifted(p.bounds,delta);
    return b.min.x<-CONFIG.arena.width/2+.005||b.max.x>CONFIG.arena.width/2-.005||b.min.z<-CONFIG.arena.depth/2+.005||b.max.z>CONFIG.arena.depth/2-.005||b.min.y<-.01||b.max.y>CONFIG.arena.height-.005;
   }))continue;
   if(group.some(p=>intersects(p,delta)))continue;
   if(group.some((p,i)=>statics.some((c,j)=>{
    if(p.bounds&&c.bounds&&!overlaps(shifted(p.bounds,delta),c.bounds,0))return false;
    metrics.narrowTests++;
    const hit=c.collider.contactShape(p.shape,add(p.position,delta),p.rotation,0);
    return !!hit&&hit.distance<Math.min(0,originalContacts[i][j])-.002;
   })))continue;
   escape=delta;direction=axis;break search;
  }
  if(!escape||!direction)continue;
  for(const pose of group){
   pose.position=add(pose.position,escape);if(pose.bounds)pose.bounds=shifted(pose.bounds,escape);
   pose.part.body.setTranslation(pose.position,true);
   pose.part.body.setLinvel(mul(direction,CONFIG.forcedRecovery.ejectSpeed),true);
   pose.part.previous={position:{...pose.position},rotation:{...pose.rotation}};pose.part.current=pose.part.previous;
   impulse+=pose.part.body.mass()*CONFIG.forcedRecovery.ejectSpeed;
  }
  metrics.movedIslands++;physics.world.propagateModifiedBodyPositionsToColliders();
 }
 return impulse;
}
export function uprightVolume(shape:RAPIER.Shape,position:Vec3):RecoveryVolume{return {shape,position,rotation:identity};}
