import { beforeAll,it,expect,vi } from 'vitest';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { connectorIntersectsSlabs,validateConnector } from '../../src/physics/Connector';
import { box,vertices } from '../../src/slicing/ConvexClipper';
import { clearRows } from '../../src/slicing/ClearTransaction';
import { splitPart,bitePart } from '../../src/slicing/Dismemberment';
import { axisAngle,identity,vec,type Vec3 } from '../../src/slicing/Math';
const shifted=(center:Vec3,half:Vec3)=>{const poly=box(half.x,half.y,half.z);for(const v of vertices(poly)){v.x+=center.x;v.y+=center.y;v.z+=center.z;}return poly;};
beforeAll(async()=>{await RAPIER.init();});
it('row crossing connector tissue severs the joint even if neither endpoint hull changes',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.2,.2,.2),{position:vec(0,.4,0),rotation:identity},5,1,'lower'),b=p.createPart(box(.2,.2,.2),{position:vec(0,2.6,0),rotation:identity},5,1,'upper');
  const connector={a:shifted(vec(0,.9,0),vec(.05,1,.05)),b:shifted(vec(0,-.9,0),vec(.05,1,.05))};
  const j=p.createJoint({a:a.id,b:b.id,anchorA:vec(0,1.1,0),anchorB:vec(0,-1.1,0),axis:vec(1,0,0),hinge:true,limits:[[-1,1]],connector});
  const ids=[...p.parts.keys()],result=clearRows(p,[1],'solver');expect(result.fragments).toBe(0);expect(result.removedVolume).toBe(0);expect([...p.parts.keys()]).toEqual(ids);expect(p.joints.has(j.id)).toBe(false);
 }finally{p.dispose();}
});
it('surviving connector, anchors and authored frames survive remapping to cut hulls',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.3,1.4,.2),{position:vec(0,1.5,0),rotation:identity},20,1,'long'),b=p.createPart(box(.2,.2,.2),{position:vec(0,2.8,0),rotation:identity},5,1,'upper');
  const connector={a:shifted(vec(0,1.15,0),vec(.04,.08,.04)),b:shifted(vec(0,-.15,0),vec(.04,.08,.04))},frame=axisAngle(vec(0,1,0),.3);
  p.createJoint({a:a.id,b:b.id,anchorA:vec(0,1.15,0),anchorB:vec(0,-.15,0),axis:vec(1,0,0),hinge:true,limits:[[-1,1]],connector,frameA:frame,frameB:frame});
  clearRows(p,[1],'solver');expect(p.joints.size).toBe(1);const j=[...p.joints.values()][0],actual=p.world.getImpulseJoint(j.handle);
  expect(j.connector).toBe(connector);expect(j.a).not.toBe(a.id);expect(actual.frameX1().y).toBeCloseTo(frame.y,6);expect(actual.frameX2().y).toBeCloseTo(frame.y,6);expect((actual as RAPIER.RevoluteImpulseJoint).limitsMin()).toBeCloseTo(-1,6);
 }finally{p.dispose();}
});
it('connector-only removals remain atomic when another fragment allocation fails',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.2,.2,.2),{position:vec(0,.4,0),rotation:identity},5,1,'lower'),b=p.createPart(box(.2,.2,.2),{position:vec(0,2.6,0),rotation:identity},5,1,'upper');
  const j=p.createJoint({a:a.id,b:b.id,anchorA:vec(0,1.1,0),anchorB:vec(0,-1.1,0),axis:vec(1,0,0),hinge:true,limits:[[-1,1]],connector:{a:shifted(vec(0,.9,0),vec(.05,1,.05)),b:shifted(vec(0,-.9,0),vec(.05,1,.05))}});
  p.createPart(box(.2,1.5,.2),{position:vec(2,1.5,0),rotation:identity},10,2,'cut-target');const ids=[...p.parts.keys()];
  const original=p.createPart.bind(p);let count=0;const spy=vi.spyOn(p,'createPart').mockImplementation((...args)=>{if(++count===2)throw Error('staged failure');return original(...args);});
  expect(()=>clearRows(p,[1],'solver')).toThrow('staged failure');expect([...p.parts.keys()]).toEqual(ids);expect(p.joints.get(j.id)).toBe(j);expect(p.clearSequence).toBe(0);spy.mockRestore();
 }finally{p.dispose();}
});
it('a saw kerf through connector volume severs it even with retained anchors',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.4,.5,.2),{position:vec(0,3,0),rotation:identity},20,1,'chest'),b=p.createPart(box(.2,.2,.2),{position:vec(0,3.8,0),rotation:identity},5,1,'head');
  const connector={a:shifted(vec(0,.3,0),vec(.04,.35,.04)),b:shifted(vec(0,-.5,0),vec(.04,.35,.04))};
  p.createJoint({a:a.id,b:b.id,anchorA:vec(0,.45,0),anchorB:vec(0,-.35,0),axis:vec(1,0,0),hinge:true,limits:[[-1,1]],connector});
  expect(splitPart(p,a.id,vec(0,3,0),vec(0,1,0))).not.toBeNull();expect(p.joints.size).toBe(0);expect(p.parts.size).toBe(3);
 }finally{p.dispose();}
});
it('biting connector tissue removes its joint without creating the eaten fragment',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.5,.2,.2),{position:vec(0,3,0),rotation:identity},20,1,'meal'),b=p.createPart(box(.15,.15,.15),{position:vec(.8,3,0),rotation:identity},5,1,'neighbor');
  p.createJoint({a:a.id,b:b.id,anchorA:vec(.4,0,0),anchorB:vec(-.4,0,0),axis:vec(1,0,0),hinge:true,limits:[[-1,1]],connector:{a:shifted(vec(.2,0,0),vec(.45,.04,.04)),b:shifted(vec(-.6,0,0),vec(.45,.04,.04))}});
  expect(bitePart(p,a.id,vec(1,0,0),.35)).not.toBeNull();expect(p.parts.size).toBe(2);expect(p.joints.size).toBe(0);
 }finally{p.dispose();}
});
it('factory applies supplied authored connector tissue at final scale without changing source metadata or masses',()=>{
 const p=new PhysicsManager();try{
  const source={a:shifted(vec(0,.18*1.85/1.765,0),vec(.04,.06,.04)),b:shifted(vec(0,-.145*1.85/1.765,0),vec(.04,.06,.04))},before=JSON.stringify(source);
  const parts=new RagdollFactory(p,2,2).spawn('normal',vec(0,5,0),identity,false,{connectors:new Map([['chest:head',source]])})!;
  const head=parts.find(b=>b.limb==='head')!,j=[...p.joints.values()].find(j=>j.b===head.id)!;expect(j.connector).toBeDefined();validateConnector(j.connector!,j.anchorA,j.anchorB);
  expect(vertices(j.connector!.a)[0].x).toBeCloseTo(vertices(source.a)[0].x*2);expect(JSON.stringify(source)).toBe(before);expect(parts.reduce((s,b)=>s+b.body.mass(),0)).toBeCloseTo(144,2);
 }finally{p.dispose();}
});
it('factory rolls back every staged body if authored tissue misses its scaled anchor',()=>{
 const p=new PhysicsManager();try{
  expect(()=>new RagdollFactory(p).spawn('normal',vec(0,5,0),identity,false,{connectors:new Map([['chest:head',{a:box(.01,.01,.01),b:box(.01,.01,.01)}]])})).toThrow('Connector volume');expect(p.parts.size).toBe(0);expect(p.joints.size).toBe(0);
 }finally{p.dispose();}
});
it('invalid metadata fails before allocating a joint and world transforms handle rotated connector tangency',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.2,.2,.2),{position:vec(0,3,0),rotation:axisAngle(vec(0,0,1),Math.PI/2)},5,1,'a'),b=p.createPart(box(.2,.2,.2),{position:vec(1,3,0),rotation:identity},5,1,'b');
  expect(()=>validateConnector({a:box(.1,.1,.1),b:box(.1,.1,.1)},vec(1,0,0),vec())).toThrow();
  expect(()=>p.createJoint({a:a.id,b:b.id,anchorA:vec(),anchorB:vec(),axis:vec(1,0,0),hinge:true,limits:[[-1,1]],frameA:{x:0,y:0,z:0,w:2}})).toThrow('Invalid authored joint frame');expect(p.joints.size).toBe(0);
  const joint={connector:{a:box(.3,.1,.1),b:box(.1,.1,.1)}};
  expect(connectorIntersectsSlabs(joint,a,b,vec(0,1,0),[{lower:3.15,upper:3.25}])).toBe(true);
  expect(connectorIntersectsSlabs(joint,a,b,vec(0,1,0),[{lower:3.3,upper:3.5}])).toBe(false);
 }finally{p.dispose();}
});
