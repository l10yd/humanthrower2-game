import {beforeAll,it,expect,vi} from 'vitest';
import {PhysicsManager,RAPIER,type Part} from '../../src/physics/PhysicsManager';
import {box} from '../../src/slicing/ConvexClipper';
import {RagdollFactory} from '../../src/physics/RagdollFactory';
import {clearRows} from '../../src/slicing/ClearTransaction';
import {splitPart,bitePart} from '../../src/slicing/Dismemberment';
import {vec,identity} from '../../src/slicing/Math';
import {ScoreManager} from '../../src/gameplay/ScoreManager';
import {RowDetector} from '../../src/grid/RowDetector';
beforeAll(async()=>{await RAPIER.init();});
const snapshot=(p:PhysicsManager)=>({
 usage:p.geometryUsage,sequence:p.clearSequence,deferred:p.deferredContacts,
 bodies:p.world.bodies.len(),colliders:p.world.colliders.len(),rawJoints:p.world.impulseJoints.len(),
 parts:[...p.parts.values()].map(v=>({id:v.id,body:v.body.handle,collider:v.collider.handle,npcId:v.npcId,owner:v.owner,generation:v.generation,poly:JSON.stringify(v.poly),density:v.density,scale:v.renderScale,position:{...v.body.translation()},rotation:{...v.body.rotation()},velocity:{...v.body.linvel()},angular:{...v.body.angvel()},mass:v.body.mass(),sleeping:v.body.isSleeping(),enabled:v.collider.isEnabled()})),
 joints:[...p.joints.values()].map(j=>({...j,valid:!!p.world.getImpulseJoint(j.handle)})),
 connected:[...p.parts.keys()].map(a=>[...p.parts.keys()].map(b=>p.connected(a,b))),
});
function fixture(){const p=new PhysicsManager(),parts=new RagdollFactory(p).spawn('normal',vec(0,2,0),identity,false)!;for(const part of parts)part.body.sleep();return {p,parts,chest:parts.find(p=>p.limb==='chest')!};}
function action(p:PhysicsManager,chest:Part,kind:'row'|'split'|'bite'){
 if(kind==='row')return clearRows(p,[1],'solver');
 if(kind==='split')return splitPart(p,chest.id,chest.body.translation(),vec(0,1,0));
 return bitePart(p,chest.id,vec(1,0,0),.12);
}
it('factory faults at each of its 11 body and 10 joint allocations roll back the entire spawn',()=>{
 for(const method of ['createPart','createJoint'] as const)for(let failure=1;failure<=(method==='createPart'?11:10);failure++){
  const p=new PhysicsManager();try{const before=snapshot(p),original=p[method].bind(p);let calls=0;
   const spy=vi.spyOn(p,method).mockImplementation(((...args:unknown[])=>{if(++calls===failure)throw Error('factory matrix fault');return Reflect.apply(original,p,args);}) as never);
   expect(()=>new RagdollFactory(p).spawn('normal',vec(0,4,0),identity,false)).toThrow('factory matrix fault');spy.mockRestore();expect(snapshot(p)).toEqual(before);
   expect(new RagdollFactory(p).spawn('normal',vec(0,4,0),identity,false)).toHaveLength(11);
  }finally{p.dispose();}
 }
});
it('native collider allocation failure releases its staged raw body',()=>{
 const p=new PhysicsManager();try{const before=snapshot(p),spy=vi.spyOn(p.world,'createCollider').mockImplementation(()=>{throw Error('native collider fault');});
  expect(()=>p.createPart(box(.2,.2,.2),{position:vec(0,4,0),rotation:identity},5,1,'test')).toThrow('native collider fault');spy.mockRestore();expect(snapshot(p)).toEqual(before);
 }finally{p.dispose();}
});
it('native joint adapter failure releases the allocated impulse joint',()=>{
 const p=new PhysicsManager();try{const a=p.createPart(box(.2,.2,.2),{position:vec(0,3,0),rotation:identity},5,1,'a'),b=p.createPart(box(.2,.2,.2),{position:vec(.4,3,0),rotation:identity},5,1,'b'),before=snapshot(p);
  const spy=vi.spyOn(p.world.impulseJoints.raw,'jointConfigureMotorModel').mockImplementation(()=>{throw Error('native motor adapter fault');});
  expect(()=>p.createJoint({a:a.id,b:b.id,anchorA:vec(.2,0,0),anchorB:vec(-.2,0,0),hinge:true,axis:vec(1,0,0),limits:[[-1,1]]})).toThrow('native motor adapter fault');spy.mockRestore();expect(snapshot(p)).toEqual(before);
 }finally{p.dispose();}
});
for(const kind of ['row','split','bite'] as const){
 const probe=()=>{const f=fixture();try{let parts=0,joints=0;const createPart=f.p.createPart.bind(f.p),createJoint=f.p.createJoint.bind(f.p);f.p.createPart=(...args)=>{parts++;return createPart(...args);};f.p.createJoint=(...args)=>{joints++;return createJoint(...args);};action(f.p,f.chest,kind);return {parts,joints};}finally{f.p.dispose();}};
 it(`${kind}: every staged body/joint allocation fault preserves physical originals, sleep, score, deadline and supports`,()=>{
  const counts=probe();expect(counts.parts).toBeGreaterThan(0);expect(counts.joints).toBeGreaterThan(0);
  for(const method of ['createPart','createJoint'] as const)for(let failure=1;failure<=counts[method==='createPart'?'parts':'joints'];failure++){
   const f=fixture(),score=new ScoreManager(),detector=new RowDetector();try{
    detector.arm(1,0);const before=snapshot(f.p),scoreBefore=JSON.stringify(score),deadline=JSON.stringify(detector.rows);
    const original=f.p[method].bind(f.p);let calls=0;
    // Both functions return different types; runtime forwarding preserves their full arguments.
    const spy=vi.spyOn(f.p,method).mockImplementation(((...args:unknown[])=>{if(++calls===failure)throw Error('injected matrix fault');return Reflect.apply(original,f.p,args);}) as never);
    expect(()=>action(f.p,f.chest,kind)).toThrow('injected matrix fault');spy.mockRestore();
    expect(snapshot(f.p),`${kind}/${method}/${failure}`).toEqual(before);expect(JSON.stringify(score)).toBe(scoreBefore);expect(JSON.stringify(detector.rows)).toBe(deadline);
    expect(action(f.p,f.chest,kind)).not.toBeNull();expect(f.parts.some(part=>!f.p.parts.has(part.id))).toBe(true);
   }finally{f.p.dispose();}
  }
  console.log(JSON.stringify({atomicMatrix:kind,parts:counts.parts,joints:counts.joints,failures:counts.parts+counts.joints}));
 });
}
