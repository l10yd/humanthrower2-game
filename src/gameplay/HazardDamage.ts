import { CollisionQuery } from '../player/QueryBounds';
import { RAPIER,type PhysicsManager } from '../physics/PhysicsManager';
import type { PlayerController } from '../player/PlayerController';
import type { BodyPart } from '../player/PlayerDamage';
import { add,length,normalize,sub,vec,type Vec3 } from '../slicing/Math';

/** Use the actually contacted limb, not always chest. Upright capsule hits map to
 * the nearest anatomical template; ragdoll colliders carry exact limb labels. */
export function hazardLimb(physics:PhysicsManager,player:PlayerController,point:Vec3,collider?:RAPIER.Collider):BodyPart{
 const part=collider?physics.partForCollider(collider):null;
 if(part?.owner==='player')return part.limb as BodyPart;
 const templates=player.ragdoll.visualParts.filter(p=>player.damage.has(p.name));
 if(!templates.length)return 'chest';
 return (templates.reduce((a,b)=>length(sub(add(player.current,a.position),point))<length(sub(add(player.current,b.position),point))?a:b).name) as BodyPart;
}
export function hazardDamage(player:PlayerController,limb:BodyPart,speed:number,mass:number,now:number){
 if(player.ragdoll.dead||!player.damage.alive||now<player.protectedUntil)return 0;
 const amount=player.damage.hit(limb,speed,mass);
 if(amount>0)player.knockDownFromAttack(mass,speed,now);
 return amount;
}
/** Player distance is measured to a collider surface, including a prone body.
 * Solid arena/obstacle geometry blocks blast damage; NPC piles do not act as walls. */
export function bombPlayer(physics:PhysicsManager,player:PlayerController,point:Vec3,now:number){
 const walls=new CollisionQuery(physics,c=>c.isEnabled()&&!c.isSensor()&&!physics.partForCollider(c)&&c.handle!==player.collider.handle).nearby(null);
 const targets=player.ragdoll.down?player.ragdoll.parts.filter(p=>physics.parts.has(p.id)).map(p=>p.collider):[player.collider];
 let nearest:{collider:RAPIER.Collider;point:Vec3;distance:number}|null=null;
 for(const collider of targets){
  if(!collider.isEnabled())continue;
  const target=collider.projectPoint(point,true)?.point;if(!target)continue;
  const distance=length(sub(target,point));
  if(nearest&&distance>=nearest.distance)continue;
  if(distance>.001){
   const ray=new RAPIER.Ray(point,normalize(sub(target,point)));
   const occluded=walls.some(c=>{const time=c.castRay(ray,Math.max(0,distance-.02),true);return time>=0&&Number.isFinite(time);});
   if(occluded)continue;
  }
  nearest={collider,point:target,distance};
 }
 if(!nearest||nearest.distance>=3)return 0;
 return hazardDamage(player,hazardLimb(physics,player,nearest.point,nearest.collider),15*(1-nearest.distance/4),45,now);
}
