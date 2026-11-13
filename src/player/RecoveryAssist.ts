import { CONFIG } from '../core/Config';
import { RAPIER,type Part,type PhysicsManager } from '../physics/PhysicsManager';
import { recoveryPathClear } from './RecoverySweep';
import { CollisionQuery,shapeBounds } from './QueryBounds';
import { add,length,normalize,sub,vec,type Vec3 } from '../slicing/Math';
/** Choose a crawl direction that does not deepen a static wall/floor overlap.
 * Dynamic debris is handled physically by local pressure, never ignored by KCC. */
export function recoveryEscapeAxis(physics:PhysicsManager,parts:Part[],preferred:number){
 const external=(c:RAPIER.Collider)=>c.isEnabled()&&!c.isSensor()&&!physics.partForCollider(c)&&c.parent()?.isKinematic()!==true;
 const query=new CollisionQuery(physics,external),axis=Math.sign(preferred)||1;
 for(const candidate of [axis,-axis])if(parts.every(p=>recoveryPathClear(physics,{shape:p.collider.shape,from:p.body.translation(),rotation:p.body.rotation(),to:add(p.body.translation(),vec(candidate*.16,0,0)),toRotation:p.body.rotation()},external,query)))return candidate;
 return 0;
}
/** Local QTE-only displacement pressure. Never writes poses, removes bodies, or
 * pushes static walls; its total impulse and each target's speed gain are bounded. */
export function openRecoverySpace(physics:PhysicsManager,parts:readonly Pick<Part,'body'|'collider'>[],axis:number,dt:number){
 const settings=CONFIG.recoveryAssist,query=new CollisionQuery(physics,c=>c.isEnabled()&&!c.isSensor()&&physics.partForCollider(c)?.owner==='npc');
 const contacts=new Map<number,{part:Part;direction:Vec3;distance:number}>();
 for(const player of parts){
  const position={...player.body.translation()},rotation={...player.body.rotation()},bounds=shapeBounds(player.collider.shape,position,rotation);
  if(bounds)for(const key of ['x','y','z'] as const){bounds.min[key]-=settings.contactDistance;bounds.max[key]+=settings.contactDistance;}
  for(const c of query.nearby(bounds)){
   const part=physics.partForCollider(c)!;if(!part.body.isDynamic())continue;
   const contact=player.collider.contactCollider(c,settings.contactDistance);if(!contact||contact.distance>settings.contactDistance)continue;
   // Do not kick the actual support below the feet downwards or lift overhead
   // weight. Push blockers sideways / into depth, with a very small budget.
   const away=sub(part.body.worldCom(),player.body.worldCom());
   if(contact.normal1.y<-.55&&away.y<-.1)continue;
   let direction=vec(away.x,0,away.z);
   if(length(direction)<.05)direction=vec(axis||Math.sign(away.x)||1,0,0);
   direction=normalize(direction);
   const previous=contacts.get(part.id);if(!previous||contact.distance<previous.distance)contacts.set(part.id,{part,direction,distance:contact.distance});
  }
 }
 const staticQuery=new CollisionQuery(physics,c=>c.isEnabled()&&!c.isSensor()&&!physics.partForCollider(c)&&c.parent()?.isKinematic()!==true);
 const selected=[...contacts.values()].sort((a,b)=>a.distance-b.distance||a.part.id-b.part.id).slice(0,settings.maxBodies);
 let remaining=settings.pushForce*dt,total=0;const moved:number[]=[];
 for(const [i,{part,direction}]of selected.entries()){
  const velocity=part.body.linvel(),along=velocity.x*direction.x+velocity.z*direction.z;
  const impulse=Math.min(remaining/(selected.length-i),Math.max(0,settings.pushSpeed-along)*part.body.mass());if(impulse<=0)continue;
  // Validate the displacement direction against static arena geometry. Dynamic
  // body contacts remain in the solver; only walls can veto the pressure.
  const to=add(part.body.translation(),vec(direction.x*.04,0,direction.z*.04));
  let blocked=false;
  for(const c of staticQuery.nearby(shapeBounds(part.collider.shape,to,part.body.rotation()))){
   const start=c.contactCollider(part.collider,0),end=c.contactShape(part.collider.shape,to,part.body.rotation(),0);
   if(end&&end.distance<Math.min(0,start?.distance??0)-.002){blocked=true;break;}
  }
  if(blocked)continue;
  part.body.applyImpulse(vec(direction.x*impulse,0,direction.z*impulse),true);remaining-=impulse;total+=impulse;moved.push(part.id);
 }
 return {impulse:total,parts:moved};
}
