import { CONFIG } from '../../src/core/Config';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { clearRows } from '../../src/slicing/ClearTransaction';
import { box } from '../../src/slicing/ConvexClipper';
import { identity, vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
describe('clear prepare/commit failure barrier',()=>{
 it('stages survivors, rolls back allocation failure, and leaves originals and transaction ID untouched',()=>{
  const p=new PhysicsManager();try{
   const a=p.createPart(box(.2,2,.2),{position:vec(0,2,0),rotation:identity},24,1,'chest');
   const pose={...a.body.translation()},vel={...a.body.linvel()},create=p.createPart.bind(p);let calls=0;
   const spy=vi.spyOn(p,'createPart').mockImplementation((...args)=>{if(++calls===2)throw Error('injected allocation failure');return create(...args);});
   expect(()=>clearRows(p,[1])).toThrow('injected allocation failure');
   expect(p.parts.size).toBe(1);expect(p.parts.get(a.id)).toBe(a);expect(a.body.isValid()).toBe(true);
   expect({...a.body.translation()}).toEqual(pose);expect({...a.body.linvel()}).toEqual(vel);expect(p.clearSequence).toBe(0);
   spy.mockRestore();const event=clearRows(p,[1]);expect(event.transactionId).toBe(1);expect(event.removedVolumeByRow[1]).toBeCloseTo(.16);
   expect(p.parts.size).toBe(2);expect(p.clearSequence).toBe(1);
  }finally{p.dispose();}
 });
 it('rolls back a late collider preparation failure before deleting originals',()=>{
  const p=new PhysicsManager();try{
   const a=p.createPart(box(.2,2,.2),{position:vec(0,2,0),rotation:identity},24,1,'chest');
   a.body.sleep();const prepare=p.prepareCollider.bind(p);let calls=0;
   const spy=vi.spyOn(p,'prepareCollider').mockImplementation((...args)=>{if(++calls===2)throw Error('late invalid hull');return prepare(...args);});
   expect(()=>clearRows(p,[1],'solver')).toThrow('late invalid hull');expect(p.parts.get(a.id)).toBe(a);expect(p.parts.size).toBe(1);expect(p.joints.size).toBe(0);expect(a.body.isSleeping()).toBe(true);expect(p.clearSequence).toBe(0);
   // Rapier allocation free-lists may change snapshot bytes on rollback, but all
   // retained body geometry/pose/velocity and ownership must remain unchanged.
   expect(a.body.translation()).toEqual(vec(0,2,0));expect(a.body.linvel()).toEqual(vec());
   spy.mockRestore();expect(clearRows(p,[1],'solver').fragments).toBe(2);
  }finally{p.dispose();}
 });
 it('rejects empty or invalid clears without changing the world',()=>{
  const p=new PhysicsManager();try{expect(()=>clearRows(p,[])).toThrow();expect(()=>clearRows(p,[CONFIG.rows.count])).toThrow();expect(p.clearSequence).toBe(0);}finally{p.dispose();}
 });
});
