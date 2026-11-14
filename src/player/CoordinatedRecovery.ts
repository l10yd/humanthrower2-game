import {RAPIER,type Part,type PhysicsManager} from '../physics/PhysicsManager';
import {CONFIG} from '../core/Config';
import {CollisionQuery,shapeBounds,translationBounds,overlaps,type Bounds} from './QueryBounds';
import {add,dot,mul,normalize,vec,type Vec3,type Quat} from '../slicing/Math';
import type {RecoveryVolume} from './ForcedRecovery';
interface Member {part:Part;shape:RAPIER.Shape;position:Vec3;rotation:Quat;bounds:Bounds|null}
export interface RecoveryTranslationPlan {parts:Part[];delta:Vec3;direction:Vec3;searchCandidates:number;closureRounds:number}
const shifted=(b:Bounds,d:Vec3):Bounds=>({min:add(b.min,d),max:add(b.max,d)});
/** Read-only coordinated rigid translation of whole connected islands. Every
 * external swept obstacle is either added intact to the same translation or
 * vetoes it. Existing intra-cluster overlaps/relative poses remain unchanged.
 * This is an arcade batch translation, not time-evolving force simulation. */
export interface RecoveryRouteWork {narrowTests:number;candidates:number;closureRounds:number;exhausted:boolean}
export function planCoordinatedRecovery(physics:PhysicsManager,seed:Part,volumes:RecoveryVolume[],center:Vec3,work:RecoveryRouteWork={narrowTests:0,candidates:0,closureRounds:0,exhausted:false},maxTests=2000):RecoveryTranslationPlan|null {
if(!Number.isSafeInteger(maxTests)||maxTests<0)throw Error('Invalid recovery route work limit');
 const members=new Map<number,Member>();
 const pose=(p:Part):Member=>{let m=members.get(p.id);if(!m){const shape=p.collider.shape,position={...p.body.translation()},rotation={...p.body.rotation()};m={part:p,shape,position,rotation,bounds:shapeBounds(shape,position,rotation)};members.set(p.id,m);}return m;};
 const island=(p:Part)=>physics.connectedParts(p.id);
 const external=(c:RAPIER.Collider)=>c.isEnabled()&&!c.isSensor()&&physics.partForCollider(c)?.owner!=='player';
 const query=new CollisionQuery(physics,external),targets=volumes.map(v=>({...v,bounds:shapeBounds(v.shape,v.position,v.rotation)}));
 const side=Math.sign(seed.body.worldCom().x-center.x)||((seed.npcId%2)?1:-1),directions=[vec(side,0,0),vec(-side,0,0),vec(0,1,0),vec(0,0,1),vec(0,0,-1)];
 let searchCandidates=0,totalRounds=0;
 const convex=(c:RAPIER.Collider)=>[RAPIER.ShapeType.Ball,RAPIER.ShapeType.Cuboid,RAPIER.ShapeType.Capsule,RAPIER.ShapeType.ConvexPolyhedron].includes(c.shape.type);
 for(let distance=.2;distance<=CONFIG.arena.height;distance+=.2)for(const axis of directions){
  searchCandidates++;work.candidates++;
  const group=new Map<number,Member>();let valid=true;
  const extend=(part:Part)=>{
   for(const p of island(part)){
    if(p.owner!=='npc'||!p.body.isDynamic()||!p.collider.isEnabled()||p.collider.isSensor()){valid=false;return;}
    group.set(p.id,pose(p));
   }
  };
  extend(seed);let delta=mul(axis,distance);
  // Closure grows monotonically, so at most parts.size rounds. Unknown shapes
  // or unsupported movable bodies veto rather than silently leave the group.
  for(let round=0;valid&&round<=physics.parts.size;round++){
   totalRounds++;work.closureRounds++;const list=[...group.values()];let projected=mul(axis,distance);
   for(const key of ['x','y','z'] as const){
    const lower=key==='x'?-CONFIG.arena.width/2+.005:key==='y'?-.01:-CONFIG.arena.depth/2+.005;
    const upper=key==='x'?CONFIG.arena.width/2-.005:key==='y'?CONFIG.arena.height-.005:CONFIG.arena.depth/2-.005;
    const lo=lower-Math.min(...list.map(m=>m.bounds?.min[key]??-Infinity)),hi=upper-Math.max(...list.map(m=>m.bounds?.max[key]??Infinity));
    if(lo>hi||!Number.isFinite(lo+hi)){valid=false;break;}projected[key]=Math.max(lo,Math.min(hi,projected[key]));
   }
   if(!valid)break;delta=projected;const before=group.size;
   let goalBlocked=false;
   for(const m of list)for(const v of targets){
    if(m.bounds&&v.bounds&&!overlaps(shifted(m.bounds,delta),v.bounds,CONFIG.forcedRecovery.clearance))continue;
    if(work.narrowTests+1>maxTests){work.exhausted=true;return null;}work.narrowTests++;
    const hit=m.shape.contactShape(add(m.position,delta),m.rotation,v.shape,v.position,v.rotation,CONFIG.forcedRecovery.clearance);
    if(hit&&hit.distance<CONFIG.forcedRecovery.clearance){goalBlocked=true;break;}
   }
   if(goalBlocked)break;
   for(const m of list){
    for(const c of query.nearby(translationBounds(m.shape,m.position,add(m.position,delta),m.rotation))){
     const other=physics.partForCollider(c);if(other&&group.has(other.id))continue;
     if(work.narrowTests+3>maxTests){work.exhausted=true;return null;}work.narrowTests+=3;
     const start=c.contactShape(m.shape,m.position,m.rotation,.002),end=c.contactShape(m.shape,add(m.position,delta),m.rotation,0);
     const separating=start?dot(start.normal1,delta):null;
     let blocked=!!end&&end.distance<Math.min(0,start?.distance??0)-.002;
     // No endpoint penetration against a non-member dynamic island, even if
     // its initial overlap was deeper. It must become part of the rigid batch.
     if(other?.body.isDynamic()&&end&&end.distance<-.002)blocked=true;
     if(start&&start.distance<0&&separating!==null&&separating<0)blocked=true;
     if(!(start&&convex(c)&&separating!==null&&separating>=0)){
      const cast=c.castShape(vec(),m.shape,m.position,m.rotation,delta,0,1,false);if(cast&&cast.time_of_impact<1-1e-7)blocked=true;
     }
     if(!blocked)continue;
     if(other?.owner==='npc'&&other.body.isDynamic()){extend(other);if(!valid)break;}
     else{valid=false;break;}
    }
    if(!valid)break;
   }
   if(!valid)break;
   if(group.size!==before)continue;
   return {parts:list.map(m=>m.part),delta,direction:normalize(delta),searchCandidates,closureRounds:totalRounds};
  }
 }
 return null;
}
