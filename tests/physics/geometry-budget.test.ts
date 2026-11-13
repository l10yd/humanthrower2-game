import { beforeAll,it,expect,vi } from 'vitest';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { box } from '../../src/slicing/ConvexClipper';
import { clearRows } from '../../src/slicing/ClearTransaction';
import { splitPart,bitePart } from '../../src/slicing/Dismemberment';
import { geometryUsage } from '../../src/slicing/GeometryBudget';
import { identity,vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('accounts positional vertices and fan triangles and releases cached usage on removal/dispose',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.2,.2,.2),{position:vec(0,3,0),rotation:identity},5,1,'head');expect(p.geometryUsage).toEqual({vertices:8,triangles:12,faces:6,corners:24});p.removePart(a.id);expect(p.geometryUsage.vertices).toBe(0);expect(p.geometryUsage.triangles).toBe(0);
 }finally{p.dispose();}expect(p.geometryUsage.vertices).toBe(0);
});
it('rejects excessive per-part topology before allocating any Rapier body',()=>{
 const p=new PhysicsManager();try{
  const poly=box(.2,.2,.2);poly.faces=Array.from({length:200},()=>poly.faces[0]);const count=p.world.bodies.len();
  expect(()=>p.createPart(poly,{position:vec(0,3,0),rotation:identity},5,1,'bad')).toThrow('face budget');expect(p.world.bodies.len()).toBe(count);expect(p.parts.size).toBe(0);
 }finally{p.dispose();}
});
it('refuses an entire spawn in preflight if its geometry exceeds the remaining world budget',()=>{
 const p=new PhysicsManager();try{
  p.geometryLimits.worldVertices=80;expect(()=>new RagdollFactory(p).spawn('normal',vec(0,5,0),identity,false)).toThrow('World geometry budget');expect(p.parts.size).toBe(0);expect(p.joints.size).toBe(0);expect(p.geometryUsage.vertices).toBe(0);
 }finally{p.dispose();}
});
it('refuses a row or saw split before allocation, retaining originals, UVs and transaction sequence',()=>{
 for(const mode of ['row','saw'] as const){const p=new PhysicsManager();try{
  const old=p.createPart(box(.4,1.5,.2),{position:vec(0,1.5,0),rotation:identity},20,1,'chest'),usage=p.geometryUsage,poly=JSON.stringify(old.poly);p.geometryLimits.worldVertices=15;const spy=vi.spyOn(p,'createPart');
  expect(()=>mode==='row'?clearRows(p,[1],'solver'):splitPart(p,old.id,vec(0,1.5,0),vec(0,1,0))).toThrow('World geometry budget');expect(spy).not.toHaveBeenCalled();expect(p.parts.get(old.id)).toBe(old);expect(JSON.stringify(old.poly)).toBe(poly);expect(p.geometryUsage).toEqual(usage);expect(p.clearSequence).toBe(0);
 }finally{p.dispose();}}
});
it('uses final post-replacement budget rather than double-counting staged originals',()=>{
 const p=new PhysicsManager();try{
  const old=p.createPart(box(.4,1.5,.2),{position:vec(0,1.5,0),rotation:identity},20,1,'chest');p.geometryLimits.worldVertices=16;
  const cut=clearRows(p,[1],'solver');expect(cut.fragments).toBe(2);expect(p.parts.has(old.id)).toBe(false);expect(p.geometryUsage.vertices).toBe(16);expect(p.geometryUsage.triangles).toBe(24);
 }finally{p.dispose();}
});
it('a consumed part frees geometry without allocating eaten pieces',()=>{
 const p=new PhysicsManager();try{
  const old=p.createPart(box(.4,.3,.2),{position:vec(0,3,0),rotation:identity},20,1,'meal');const result=bitePart(p,old.id,vec(1,0,0),10)!;expect(result.fragments).toBe(0);expect(p.geometryUsage.vertices).toBe(0);expect(p.geometryUsage.triangles).toBe(0);
 }finally{p.dispose();}
});
it('rolls back geometry counters after a staged allocation failure',()=>{
 const p=new PhysicsManager();try{
  p.createPart(box(.4,1.5,.2),{position:vec(0,1.5,0),rotation:identity},20,1,'chest');const before=p.geometryUsage,create=p.createPart.bind(p);let calls=0;
  vi.spyOn(p,'createPart').mockImplementation((...args)=>{if(++calls===2)throw Error('staged failure');return create(...args);});expect(()=>clearRows(p,[1],'solver')).toThrow('staged failure');expect(p.geometryUsage).toEqual(before);
 }finally{p.dispose();}
});
it('ordinary direct allocations also respect world limits without destructive cleanup',()=>{
 const p=new PhysicsManager();try{
  p.geometryLimits.worldTriangles=12;p.createPart(box(.2,.2,.2),{position:vec(0,3,0),rotation:identity},5,1,'first');expect(()=>p.createPart(box(.2,.2,.2),{position:vec(1,3,0),rotation:identity},5,2,'second')).toThrow('World geometry budget');expect(p.parts.size).toBe(1);expect(p.geometryUsage.triangles).toBe(12);
 }finally{p.dispose();}
});
