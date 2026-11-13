import { CONFIG } from '../core/Config';
import { PhysicsManager,RAPIER,type Part } from '../physics/PhysicsManager';
import type { PlayerController } from '../player/PlayerController';
import { shapeBounds,CollisionQuery } from '../player/QueryBounds';
import { splitPart,severJoint,type CutResult } from '../slicing/Dismemberment';
import { add,axisAngle,mul,vec,type Vec3 } from '../slicing/Math';

export interface GuardPose {base:Vec3;direction:Vec3;normal:Vec3;angle:number}
/** Active upward blade catches a swept falling hull BEFORE the player impact
 * detector/solver. The cut preserves momentum; immunity prevents knockdown. */
export class SawGuard {
 interceptions=0;private next=0;cuts:CutResult[]=[];
 constructor(private physics:PhysicsManager,private player:PlayerController){}
 update(active:boolean,pose:GuardPose,dt:number):boolean {
  this.cuts=[];
  if(!active||pose.direction.y<CONFIG.sawGuard.minUp||this.player.ragdoll.down||this.physics.time<this.next)return false;
  this.physics.world.propagateModifiedBodyPositionsToColliders();
  const rotation=axisAngle(vec(0,0,1),pose.angle);
  const nominal=new RAPIER.Cuboid(CONFIG.saw.reach/2,CONFIG.saw.halfWidth,CONFIG.saw.halfDepth);
  const nominalCenter=add(pose.base,mul(pose.direction,CONFIG.saw.reach/2));
  const staticQuery=new CollisionQuery(this.physics,c=>c.isEnabled()&&!c.isSensor()&&!this.physics.partForCollider(c)&&c.handle!==this.player.collider.handle);
  const ray=new RAPIER.Ray(pose.base,pose.direction);let reach:number=CONFIG.saw.reach;
  for(const wall of staticQuery.nearby(shapeBounds(nominal,nominalCenter,rotation)))reach=Math.min(reach,wall.castRay(ray,reach,true));
  if(reach<=.01)return false;
  const shape=new RAPIER.Cuboid(reach/2,CONFIG.saw.halfWidth,CONFIG.saw.halfDepth);
  const center=add(pose.base,mul(pose.direction,reach/2));
  const bounds=shapeBounds(shape,center,rotation)!;
  // Expand upwards by the maximum approach for this tick, while narrow-phase
  // still requires actual contact or a swept contact with the blade.
  let fall=0;for(const part of this.physics.parts.values())if(part.owner==='npc')fall=Math.max(fall,-part.body.linvel().y*dt);
  bounds.max.y+=fall;
  const query=new CollisionQuery(this.physics,c=>c.isEnabled()&&!c.isSensor()&&this.physics.partForCollider(c)?.owner==='npc');
  const targets=query.nearby(bounds).map(c=>this.physics.partForCollider(c)!).filter(p=>p.body.linvel().y<=-CONFIG.sawGuard.minFallSpeed&&p.body.worldCom().y>this.player.current.y+.3).sort((a,b)=>a.body.worldCom().y-b.body.worldCom().y);
  let caught:Part|undefined;
  for(const part of targets){
   const contact=part.collider.contactShape(shape,center,rotation,0);
   const swept=contact&&contact.distance<=0?true:!!part.collider.castShape(part.body.linvel(),shape,center,rotation,vec(),0,dt,true);
   if(swept){caught=part;break;}
  }
  if(!caught)return false;
  const caughtIds=new Set([...this.physics.parts.values()].filter(p=>p.owner==='npc'&&this.physics.connected(p.id,caught!.id)).map(p=>p.id));
  const npcId=caught.npcId,cutPoint={...caught.body.worldCom()},normal=vec(1,0,0);
  // Split the intercepted segment through its COM, ensuring two meaningful
  // halves even for a glancing hit at the edge of the upright blade.
  const split=splitPart(this.physics,caught.id,cutPoint,normal);
  if(split)this.cuts.push(split);
  const survivorIds=new Set(split?.replacement?.survivorIds??[]);
  const family=[...this.physics.parts.values()].filter(p=>p.owner==='npc'&&p.npcId===npcId&&(caughtIds.has(p.id)||survivorIds.has(p.id)));
  const familyIds=new Set(family.map(p=>p.id));
  for(const joint of [...this.physics.joints.values()]){
   const a=this.physics.parts.get(joint.a),b=this.physics.parts.get(joint.b);
   if(!a||!b||!familyIds.has(a.id)||!familyIds.has(b.id))continue;
   const ax=a.body.worldCom().x-cutPoint.x,bx=b.body.worldCom().x-cutPoint.x;
   if(ax*bx<=0){const result=severJoint(this.physics,joint.id);if(result)this.cuts.push(result);}
  }
  // A narrow segment may reject the kerf split; sever at least one real joint
  // instead. No phantom success/protection on an uncut standalone sliver.
  if(!this.cuts.length){
   const joint=[...this.physics.joints.values()].find(j=>family.some(p=>p.id===j.a||p.id===j.b));
   const result=joint&&severJoint(this.physics,joint.id);if(result)this.cuts.push(result);
  }
  if(!this.cuts.length)return false;
  // Cutting retains the incoming velocity field, mass and spin. Gravity and
  // contact impulses separate the halves naturally; no launch/upward kick.
  this.player.protectedUntil=Math.max(this.player.protectedUntil,this.physics.time+CONFIG.sawGuard.playerGrace);
  this.interceptions++;this.next=this.physics.time+CONFIG.sawGuard.cooldown;return true;
 }
}
