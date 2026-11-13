import type { Collider } from '@dimforge/rapier3d-compat';
import type { Part, PhysicsManager } from './PhysicsManager';
import { CollisionQuery, sweptBounds } from '../player/QueryBounds';
import { add, dot, length, mul, sub, vec, type Vec3 } from '../slicing/Math';
export interface SeparationPose {part:Part;position:Vec3}
interface Constraint {normal:Vec3;distance:number}
export interface SeparationAttempt {kind:string;moves:Vec3[];blockers:{part:number;other:number|'static';before:number;after:number}[];improvement:number}
/** Bounded positional contact recovery, never a force/velocity kick or a new joint. */
export function planSeparation(physics:PhysicsManager,a:Part,b:Part,groups:Part[][],caps:number[],normal:Vec3,depth:number,allowProjection=true){
  const attempts:SeparationAttempt[]=[];
  const own=new Map<number,number>();groups.forEach((group,i)=>group.forEach(p=>own.set(p.id,i)));
  const query=new CollisionQuery(physics,c=>c.isEnabled()&&!c.isSensor());
  const mass=groups.map(group=>group.reduce((sum,p)=>sum+p.body.mass(),0));
  const beforePair=a.collider.contactCollider(b.collider,.02)!.distance;
  const targetPair=(p:Part,c:Collider)=>p.id===a.id&&c.handle===b.collider.handle||p.id===b.id&&c.handle===a.collider.handle;
  const evaluate=(moves:Vec3[],kind:string):SeparationPose[]|null=>{
    const blockers:SeparationAttempt['blockers']=[];
    const poses=groups.flatMap((group,i)=>group.map(part=>({part,position:add(part.body.translation(),moves[i])})));
    // Check the whole segment, including relative movement of the other island. Broad
    // phase is expanded for that other island's correction, not just its starting pose.
    for(const {part,position}of poses){
      const from={...part.body.translation()},rotation={...part.body.rotation()},shape=part.collider.shape,group=own.get(part.id)!;
      const bounds=sweptBounds(shape,from,position);
      if(bounds)for(const k of ['x','y','z'] as const){bounds.min[k]-=.015;bounds.max[k]+=.015;}
      for(const c of query.nearby(bounds)){
        const other=physics.partForCollider(c),otherGroup=other?own.get(other.id):undefined;
        if(otherGroup===group||targetPair(part,c))continue;
        const otherMove=otherGroup===undefined?vec():moves[otherGroup];
        const baseline=c.contactCollider(part.collider,.02),allowed=Math.min(0,baseline?.distance??0)-.002;
        const displacement=sub(moves[group],otherMove),samples=Math.max(1,Math.ceil(length(displacement)/.004));
        let blocked=false;
        for(let i=1;i<=samples;i++){
          // Relative translation lets us query c's live shape without altering either body.
          const contact=c.contactShape(shape,add(from,mul(displacement,i/samples)),rotation,0);
          if(contact&&contact.distance<allowed){blockers.push({part:part.id,other:other?.id??'static',before:baseline?.distance??0,after:contact.distance});blocked=true;break;}
        }
        if(!blocked&&(!baseline||baseline.distance>.002)&&length(displacement)>1e-9){
          const hit=c.castShape(vec(),shape,from,rotation,displacement,0,1,false);
          if(hit&&hit.time_of_impact<1)blockers.push({part:part.id,other:other?.id??'static',before:baseline?.distance??0,after:0});
        }
      }
    }
    const relative=sub(moves[0],moves[1]);
    const after=b.collider.contactShape(a.collider.shape,add(a.body.translation(),relative),a.body.rotation(),.05);
    const improvement=(after?.distance??.05)-beforePair;
    attempts.push({kind,moves:moves.map(v=>({...v})),blockers,improvement});
    return blockers.length===0&&improvement>1e-5?poses:null;
  };
  for(const share of [mass[1]/(mass[0]+mass[1]),0,1]){
    const moves=[mul(normal,-Math.min(caps[0],depth*share)),mul(normal,Math.min(caps[1],depth*(1-share)))];
    const poses=evaluate(moves,`normal:${share}`);if(poses)return {poses,attempts};
  }
  if(!allowProjection)return {poses:null,attempts};
  // Contact halfspaces describe locally available directions. Project onto all nearby
  // surfaces, which permits tangential motion when moving along the pair normal jams.
  // These linear constraints propose a candidate only: exact geometry above must accept it.
  const constraints=groups.map((group,i)=>{
    const result:Constraint[]=[];
    for(const p of group){
      const from={...p.body.translation()},bounds=sweptBounds(p.collider.shape,from,from);
      for(const c of query.nearby(bounds)){
        const other=physics.partForCollider(c);
        if(other&&own.get(other.id)===i||targetPair(p,c))continue;
        const contact=c.contactCollider(p.collider,.025);
        if(contact)result.push({normal:{...contact.normal1},distance:contact.distance});
      }
    }return result;
  });
  const moves=constraints.map((contacts,i)=>{
    let v=mul(normal,i===0?-caps[i]:caps[i]);
    for(let iteration=0;iteration<24;iteration++){
      for(const c of contacts){const violation=-Math.max(0,c.distance)-.0005-dot(v,c.normal);if(violation>0)v=add(v,mul(c.normal,violation));}
      const speed=length(v);if(speed>caps[i])v=mul(v,caps[i]/speed);
    }return v;
  });
  for(const scale of [1,.5,.25,.125]){
    const poses=evaluate(moves.map(v=>mul(v,scale)),`contact-projection:${scale}`);if(poses)return {poses,attempts};
  }
  return {poses:null,attempts};
}
