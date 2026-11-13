import { beforeAll, describe, expect, it } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { box } from '../../src/slicing/ConvexClipper';
import { identity, vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
describe('severed adjacent contacts',()=>{
  it('keeps overlapping former neighbors from kicking, then restores contacts without adding velocity',()=>{
    const p=new PhysicsManager();try {
      const a=p.createPart(box(.1,.1,.1),{position:vec(0,3,0),rotation:identity},5,1,'head');
      const b=p.createPart(box(.1,.1,.1),{position:vec(.19,3,0),rotation:identity},5,1,'chest');
      p.deferDetachedContacts(new Set([1]));expect(p.deferredContacts).toBe(1);
      expect(p.hooks.filterContactPair(a.collider.handle,b.collider.handle,a.body.handle,b.body.handle)).toBeNull();
      for(let i=0;i<12;i++)p.step();
      expect(p.deferredContacts).toBe(0);expect(p.pairSeparations).toBeGreaterThan(0);
      expect(Math.abs(a.body.linvel().x)).toBeLessThan(.001);expect(Math.abs(b.body.linvel().x)).toBeLessThan(.001);
      expect(p.hooks.filterContactPair(a.collider.handle,b.collider.handle,a.body.handle,b.body.handle)).toBe(RAPIER.SolverFlags.COMPUTE_IMPULSE);
    }finally{p.dispose();}
  });
  it('moves only the upper island when mass-weighted separation would push its former neighbor into the floor',()=>{
    const p=new PhysicsManager();try{
      const a=p.createPart(box(.1,.1,.1),{position:vec(0,.1,0),rotation:identity},5,1,'lower');
      const b=p.createPart(box(.1,.1,.1),{position:vec(0,.29,0),rotation:identity},5,1,'upper');
      p.deferDetachedContacts(new Set([1]));p.time=.16;
      (p as unknown as {reenableDetachedContacts():void}).reenableDetachedContacts();
      expect(a.body.translation().y).toBeCloseTo(.1,5);expect(b.body.translation().y).toBeGreaterThan(.29);
      expect(a.body.linvel()).toEqual(vec());expect(b.body.linvel()).toEqual(vec());
      (p as unknown as {reenableDetachedContacts():void}).reenableDetachedContacts();expect(p.deferredContacts).toBe(0);
    }finally{p.dispose();}
  });
  it('a completely enclosed pair stays unchanged and reports a technical fault rather than forcing a correction',()=>{
    const p=new PhysicsManager();try{
      const a=p.createPart(box(.1,.1,.1),{position:vec(-.095,3,0),rotation:identity},5,1,'left');
      const b=p.createPart(box(.1,.1,.1),{position:vec(.095,3,0),rotation:identity},5,1,'right');
      for(const x of [-.215,.215])p.world.createCollider(RAPIER.ColliderDesc.cuboid(.02,.3,.3).setTranslation(x,3,0));
      p.deferDetachedContacts(new Set([1]));p.time=.16;
      const poses=[a,b].map(part=>({...part.body.translation()}));
      expect(()=>(p as unknown as {reenableDetachedContacts():void}).reenableDetachedContacts()).toThrow('Невозможно безопасно');
      expect([a,b].map(part=>({...part.body.translation()}))).toEqual(poses);expect(p.separationFault).not.toBeNull();
    }finally{p.dispose();}
  });
  it('separated fragments immediately collide and non-cut families are not exempt',()=>{
    const p=new PhysicsManager();try {
      const a=p.createPart(box(.1,.1,.1),{position:vec(0,3,0),rotation:identity},5,1,'head');
      const b=p.createPart(box(.1,.1,.1),{position:vec(.5,3,0),rotation:identity},5,1,'chest');
      p.deferDetachedContacts(new Set([1]));expect(p.deferredContacts).toBe(0);
      expect(p.hooks.filterContactPair(a.collider.handle,b.collider.handle,a.body.handle,b.body.handle)).toBe(RAPIER.SolverFlags.COMPUTE_IMPULSE);
    }finally{p.dispose();}
  });
});
