import {beforeAll,expect,it,vi} from 'vitest';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {GeometryRead,box,clip,validate,type ConvexPolyhedron} from '../../src/slicing/ConvexClipper';
import {geometryUsage} from '../../src/slicing/GeometryBudget';
import {clearRows} from '../../src/slicing/ClearTransaction';
import {type GeometryLimits} from '../../src/slicing/GeometryBudget';
import {RagdollFactory} from '../../src/physics/RagdollFactory';
import {vec,identity} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('single allocation shares welding across budget, validation and collider coordinates without sharing between operations',()=>{
 const p=new PhysicsManager();try{
  const poly=box(.2,.3,.2);p.createPart(poly,{position:vec(0,3,0),rotation:identity},5,1,'a');
  expect(p.allocationQueries).toEqual({reads:5,welds:1});
  p.createPart(poly,{position:vec(1,3,0),rotation:identity},5,2,'b');expect(p.allocationQueries).toEqual({reads:10,welds:2});
 }finally{p.dispose();}
});
it('reference and shared allocation produce the same bodies, colliders and native mass frames',()=>{
 const a=new PhysicsManager(),b=new PhysicsManager();a.shareAllocationGeometry=false;
 try{
  for(let i=0;i<8;i++){
   const poly=clip(box(.23,.41,.13),vec(1,.2,.3),.2-i*.02)!;
   const x=a.createPart(poly,{position:vec(i*.4,3,0),rotation:identity},5,i+1,'fragment'),y=b.createPart(poly,{position:vec(i*.4,3,0),rotation:identity},5,i+1,'fragment');
   expect(y.body.mass()).toBe(x.body.mass());expect(y.body.localCom()).toEqual(x.body.localCom());expect(y.body.principalInertia()).toEqual(x.body.principalInertia());expect(y.collider.shape).toEqual(x.collider.shape);
  }
  expect(b.world.takeSnapshot()).toEqual(a.world.takeSnapshot());
 }finally{a.dispose();b.dispose();}
});
it('cached-plane validation rejects the same invalid topology/UVs as the reference path',()=>{
 const valid=box(.2,.3,.2),open={faces:valid.faces.slice(1)},concave=structuredClone(valid),nonfinite=structuredClone(valid),badUv=structuredClone(valid);
 concave.faces[0].vertices[0].x=.5;nonfinite.faces[0].vertices[0].x=NaN;badUv.faces[0].uvs=[{u:NaN,v:0}];
 const failure=(poly:ConvexPolyhedron,read?:GeometryRead)=>{try{if(read)validate(poly,read);else validate(poly);return null;}catch(e){return String(e);}};
 for(const poly of [valid,open,concave,nonfinite,badUv])expect(failure(poly,new GeometryRead())).toBe(failure(poly));
 expect(()=>[valid,valid].forEach(validate)).not.toThrow();
 const read=new GeometryRead();expect(geometryUsage(valid,undefined,read)).toEqual(geometryUsage(valid));
});
it('read scope preserves complete jointed clear transactions and subsequent solver trajectories',()=>{
 const a=new PhysicsManager(),b=new PhysicsManager();a.shareAllocationGeometry=false;
 try{
  for(const p of [a,b])new RagdollFactory(p).spawn('normal',vec(0,1.5,0),identity,false);
  expect(clearRows(b,[1],'solver')).toEqual(clearRows(a,[1],'solver'));
  expect(b.geometryUsage).toEqual(a.geometryUsage);expect([...b.joints.values()]).toEqual([...a.joints.values()]);
  expect(b.world.takeSnapshot()).toEqual(a.world.takeSnapshot());
  for(let i=0;i<60;i++){a.step();b.step();}
  expect(b.world.takeSnapshot()).toEqual(a.world.takeSnapshot());
 }finally{a.dispose();b.dispose();}
});
it('even a warmed read scope rechecks changed budgets before collider allocation',()=>{
 const poly=box(.2,.3,.2),read=new GeometryRead();geometryUsage(poly,undefined,read);
 const limits:GeometryLimits={partVertices:7,partTriangles:512,partFaces:128,partCorners:1024,worldVertices:1000,worldTriangles:1000};
 expect(()=>geometryUsage(poly,limits,read)).toThrow('vertex budget');
});
it('a failure releases the allocation read scope before the next geometry mutation and retry',()=>{
 const p=new PhysicsManager();try{
  const poly=box(.2,.3,.2),prepare=p.prepareCollider.bind(p),spy=vi.spyOn(p,'prepareCollider').mockImplementation(()=>{throw Error('scope failure');});
  expect(()=>p.createPart(poly,{position:vec(0,3,0),rotation:identity},5,1,'a')).toThrow('scope failure');spy.mockRestore();
  poly.faces.splice(0,1);expect(()=>prepare(poly,10)).toThrow('Open/non-manifold');expect(p.parts.size).toBe(0);
 }finally{p.dispose();}
});
