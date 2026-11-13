import { beforeAll, describe, expect, it } from 'vitest';
import fixture from '../fixtures/separation-chaos.json';
import { PhysicsManager, RAPIER, type Part } from '../../src/physics/PhysicsManager';
import { planSeparation } from '../../src/physics/Separation';
import { length, sub } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
/** Same pinned engine/platform replay, not a cross-platform determinism claim. */
function restoreFixture(){
 const p=new PhysicsManager();p.separationProjectionEnabled=true;p.world.free();p.world=RAPIER.World.restoreSnapshot(Uint8Array.from(atob(fixture.snapshot),c=>c.charCodeAt(0)));
 p.time=fixture.time;
 const internals=p as unknown as {colliderParts:Map<number,Part>;detachedPairs:Map<string,{a:number;b:number;expires:number}>};
 for(const part of fixture.parts){
  const body=p.world.getRigidBody(part.body),collider=p.world.getCollider(part.collider),pose={position:{...body.translation()},rotation:{...body.rotation()}};
  const record={...part,owner:part.owner as Part['owner'],body,collider,previous:pose,current:pose};p.parts.set(part.id,record);internals.colliderParts.set(collider.handle,record);
 }
 for(const j of fixture.joints)p.joints.set(j.id,{...j,limits:j.limits as [number,number][]});
 for(const pair of fixture.pairs)internals.detachedPairs.set(`${Math.min(pair.a,pair.b)}:${Math.max(pair.a,pair.b)}`,pair);
 return p;
}
const poses=(p:PhysicsManager)=>[...p.parts.values()].map(part=>({id:part.id,position:{...part.body.translation()},rotation:{...part.body.rotation()},v:{...part.body.linvel()},w:{...part.body.angvel()}}));
describe('captured 150-part natural clear/contact barrier',()=>{
 it('plans a tangential correction when all three normal-only candidates are blocked',()=>{
  const p=restoreFixture();try{
   const a=p.parts.get(fixture.pair.a)!,b=p.parts.get(fixture.pair.b)!,contact=a.collider.contactCollider(b.collider,.1)!;
   const groups=[a,b].map(source=>[...p.parts.values()].filter(part=>p.connected(source.id,part.id)));
   const before=poses(p),result=planSeparation(p,a,b,groups,[.015,.015],{...contact.normal1},.022-contact.distance);
   expect(poses(p)).toEqual(before);expect(result.poses).not.toBeNull();
   expect(result.attempts.slice(0,3).every(attempt=>attempt.blockers.length>0)).toBe(true);
   const accepted=result.attempts.at(-1)!;expect(accepted.kind).toContain('contact-projection');
   expect(accepted.blockers).toEqual([]);expect(accepted.improvement).toBeGreaterThan(.006);
   expect(accepted.moves.every(v=>length(v)<=.015)).toBe(true);
  }finally{p.dispose();}
 });
 it('handles all pending pairs in one barrier without exceeding a shared per-part displacement budget or changing velocities',()=>{
  const p=restoreFixture();try{
   const before=poses(p);const count=p.parts.size,joints=p.joints.size;
   (p as unknown as {reenableDetachedContacts():void}).reenableDetachedContacts();
   expect(p.parts.size).toBe(count);expect(p.joints.size).toBe(joints);expect(p.separationFault).toBeNull();
   for(const part of p.parts.values()){
    const old=before.find(p=>p.id===part.id)!;
    expect(length(sub(part.body.translation(),old.position))).toBeLessThanOrEqual(.015001);
    expect({...part.body.linvel()}).toEqual(old.v);expect({...part.body.angvel()}).toEqual(old.w);expect({...part.body.rotation()}).toEqual(old.rotation);
   }
   const a=p.parts.get(fixture.pair.a)!,b=p.parts.get(fixture.pair.b)!;
   expect(a.collider.contactCollider(b.collider,.1)!.distance).toBeGreaterThan(-.027568+.006);
   expect(p.pairSeparations).toBeGreaterThan(0);
  }finally{p.dispose();}
 });
});
