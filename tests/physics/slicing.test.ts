import { beforeAll, describe, it, expect } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { belowFragmentScale, clearRows } from '../../src/slicing/ClearTransaction';
import { box, massProperties } from '../../src/slicing/ConvexClipper';
import { axisAngle, identity, pointVelocity, vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
describe('physical clear transaction',()=>{
  it('retains geometry outside a world-space row, density, pose and velocity field',()=>{
    const physics=new PhysicsManager();try {
      const rotation=axisAngle(vec(0,0,1),.4),position=vec(0,2,0);
      const original=physics.createPart(box(.3,2,.2),{position,rotation},24,1,'test');
      original.body.recomputeMassPropertiesFromColliders();const v=vec(1,-2,.5),w=vec(.2,.3,-.1);
      original.body.setLinvel(v,true);original.body.setAngvel(w,true);const com={...original.body.worldCom()};
      const before=massProperties(original.poly).volume,rho=original.density;
      const result=clearRows(physics,[1]);expect(result.fragments).toBe(2);
      const remaining=[...physics.parts.values()];
      expect(remaining.reduce((n,p)=>n+massProperties(p.poly).volume,result.removedVolume)).toBeCloseTo(before,6);
      for(const p of remaining){expect(p.body.translation().x).toBeCloseTo(position.x,5);expect(p.body.translation().y).toBeCloseTo(position.y,5);
        expect(p.body.rotation().z).toBeCloseTo(rotation.z,5);expect(p.body.mass()).toBeCloseTo(rho*massProperties(p.poly).volume,3);
        const expected=pointVelocity(v,w,p.body.worldCom(),com),actual=p.body.linvel();
        expect(actual.x).toBeCloseTo(expected.x,5);expect(actual.y).toBeCloseTo(expected.y,5);expect(actual.z).toBeCloseTo(expected.z,5);
      }
      clearRows(physics,[2]);expect(physics.parts.size).toBeGreaterThan(0);physics.step();expect(physics.numericFaults).toBe(0);
    }finally{physics.dispose();}
  });
  it('dust policy requires BOTH tiny volume and sub-15mm extent, never drops a long thin strip',()=>{
    expect(belowFragmentScale(box(.001,.001,.001))).toBe(true);
    expect(belowFragmentScale(box(.00001,.3,.00001))).toBe(false);
    expect(belowFragmentScale(box(.1,.1,.1))).toBe(false);
  });
  it('does not delete head or lower legs when cutting the middle body',()=>{
    const physics=new PhysicsManager();try {
      const head=physics.createPart(box(.1,.1,.1),{position:vec(0,2.5,0),rotation:identity},5,1,'head');
      const chest=physics.createPart(box(.2,.3,.1),{position:vec(0,1.5,0),rotation:identity},22,1,'chest');
      const leg=physics.createPart(box(.1,.2,.1),{position:vec(0,.4,0),rotation:identity},8,1,'leg');
      clearRows(physics,[1]);expect(physics.parts.has(chest.id)).toBe(false);expect(physics.parts.has(head.id)).toBe(true);expect(physics.parts.has(leg.id)).toBe(true);
      expect(head.body.translation().y).toBeCloseTo(2.5);expect(leg.body.translation().y).toBeCloseTo(.4);
    }finally{physics.dispose();}
  });
});
