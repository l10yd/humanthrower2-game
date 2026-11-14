import { beforeAll, describe, it, expect,vi } from 'vitest';
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
  it('prepares each survivor collider only once before staged allocation',()=>{
    const physics=new PhysicsManager();try{
      physics.createPart(box(.2,2,.2),{position:vec(0,2,0),rotation:identity},24,1,'chest');
      const prepare=vi.spyOn(physics,'prepareCollider'),result=clearRows(physics,[1],'solver');
      expect(result.fragments).toBe(2);expect(prepare).toHaveBeenCalledTimes(result.fragments);
    }finally{physics.dispose();}
  });
  it('rejects 300 distant intact parts before slab clipping without waking or replacing them',()=>{
    const physics=new PhysicsManager();try{
      const distant=[];for(let i=0;i<300;i++){const p=physics.createPart(box(.04,.04,.04),{position:vec((i%10-4.5)*.5,6+Math.floor(i/10)*.1,0),rotation:identity},1,i+1,'distant');p.body.sleep();distant.push(p);}
      const cut=physics.createPart(box(.2,.2,.2),{position:vec(0,1.5,0),rotation:identity},5,1000,'cut');
      const result=clearRows(physics,[1],'solver');expect(result.removedVolume).toBeGreaterThan(0);expect(physics.parts.has(cut.id)).toBe(false);
      expect(physics.clearQueries).toEqual({scannedParts:301,clippedParts:1,skippedParts:300});
      expect(distant.every(p=>physics.parts.get(p.id)===p&&p.body.isSleeping())).toBe(true);
    }finally{physics.dispose();}
  });
  it('keeps the established dust cleanup outside the row but retains long thin strips',()=>{
    const physics=new PhysicsManager();try{
      const dust=physics.createPart(box(.001,.001,.001),{position:vec(0,6,0),rotation:identity},.001,1,'dust');
      const strip=physics.createPart(box(.00001,.3,.00001),{position:vec(0,6,0),rotation:identity},.001,2,'strip');
      clearRows(physics,[1],'solver');expect(physics.parts.has(dust.id)).toBe(false);expect(physics.parts.has(strip.id)).toBe(true);
    }finally{physics.dispose();}
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
