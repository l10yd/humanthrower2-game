import {beforeAll,expect,it,vi} from 'vitest';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {clearRows} from '../../src/slicing/ClearTransaction';
import {prepareRowJob,RowPreparationCache} from '../../src/slicing/RowPreparationCache';
import {box} from '../../src/slicing/ConvexClipper';
import {axisAngle,identity,vec} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
function fixture(){const p=new PhysicsManager();for(let i=0;i<10;i++)p.createPart(box(.15,.75,.12),{position:vec((i-5)*.5,1.5+i*.025,0),rotation:axisAngle(vec(0,0,1),i*.02)},10,i+1,'fragment');return p;}
it('pure worker preparation preserves exact geometry, scores, velocities and staged world state',()=>{
 const a=fixture(),b=fixture();try{
  const cache=new RowPreparationCache(),job=cache.request(b.parts.values(),[1]);cache.accept(prepareRowJob(structuredClone(job)));
  const plain=clearRows(a,[1],'solver'),prepared=clearRows(b,[1],'solver',false,[],cache);
  expect(prepared).toEqual(plain);expect(cache.hits).toBe(10);
  const state=(p:PhysicsManager)=>[...p.parts.values()].map(s=>({poly:s.poly,mass:s.body.mass(),pose:s.body.translation(),rotation:s.body.rotation(),v:s.body.linvel(),w:s.body.angvel()}));
  expect(state(b)).toEqual(state(a));
 }finally{a.dispose();b.dispose();}
});
it('rejects stale pose, geometry identity, rows, reordered answers and deleted/replaced IDs',()=>{
 const p=fixture();try{
  const cache=new RowPreparationCache(),first=cache.request(p.parts.values(),[1]),second=cache.request(p.parts.values(),[1]);
  cache.accept(prepareRowJob(first));expect(cache.stale).toBe(1);cache.accept(prepareRowJob(second));
  const source=[...p.parts.values()][0],pose={position:{...source.body.translation()},rotation:{...source.body.rotation()}};
  expect(cache.get(source,pose,[1])).toBeDefined();expect(cache.get(source,pose,[2])).toBeUndefined();
  source.body.setTranslation(vec(pose.position.x,pose.position.y+.000001,0),false);
  expect(cache.get(source,{position:{...source.body.translation()},rotation:pose.rotation},[1])).toBeUndefined();
  expect(cache.get({...source,poly:structuredClone(source.poly)},pose,[1])).toBeUndefined();
  p.removePart(source.id);const replacement=p.createPart(box(.15,.75,.12),pose,10,1,'fragment');expect(cache.get(replacement,pose,[1])).toBeUndefined();
  cache.reset();cache.accept(prepareRowJob(second));expect(cache.snapshot.preparedParts).toBe(0);
 }finally{p.dispose();}
});
it('prepared geometry keeps allocation rollback atomic and reusable on retry',()=>{
 const p=new PhysicsManager();try{
  const source=p.createPart(box(.2,2,.2),{position:vec(0,2,0),rotation:identity},24,1,'chest');source.body.sleep();
  const cache=new RowPreparationCache();cache.accept(prepareRowJob(cache.request(p.parts.values(),[1])));
  const create=p.createPart.bind(p);let calls=0;const spy=vi.spyOn(p,'createPart').mockImplementation((...args)=>{if(++calls===2)throw Error('worker stage failure');return create(...args);});
  expect(()=>clearRows(p,[1],'solver',false,[],cache)).toThrow('worker stage failure');expect(p.parts.size).toBe(1);expect(source.body.isSleeping()).toBe(true);expect(p.clearSequence).toBe(0);
  spy.mockRestore();expect(clearRows(p,[1],'solver',false,[],cache).fragments).toBe(2);
 }finally{p.dispose();}
});
