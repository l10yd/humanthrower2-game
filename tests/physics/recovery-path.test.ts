import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { recoveryPathClear } from '../../src/player/RecoverySweep';
import { axisAngle, identity, vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
describe('get-up swept path',()=>{
  const external=()=>true;
  it('rejects an obstacle between two clear endpoints',()=>{
    const p=new PhysicsManager();try{
      p.world.createCollider(RAPIER.ColliderDesc.cuboid(.08,.08,.08).setTranslation(0,2,0));
      const shape=new RAPIER.Ball(.08);
      expect(recoveryPathClear(p,{shape,from:vec(-.5,2,0),rotation:identity,to:vec(.5,2,0)},external)).toBe(false);
    }finally{p.dispose();}
  });
  it('rejects an obstruction in the arc of a rotating limb',()=>{
    const p=new PhysicsManager();try {
      p.world.createCollider(RAPIER.ColliderDesc.ball(.08).setTranslation(.28,2.28,0));
      expect(recoveryPathClear(p,{shape:new RAPIER.Cuboid(.04,.5,.04),from:vec(0,2,0),rotation:axisAngle(vec(0,0,1),-Math.PI/2),to:vec(0,2,0)},external)).toBe(false);
    }finally{p.dispose();}
  });
  it('culls distant shapes before expensive rotating casts, even before the first world step',()=>{
    const p=new PhysicsManager();try{
      const far=p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,.1,.1).setTranslation(100,2,0));
      const contacts=vi.spyOn(far,'contactShape');
      expect(recoveryPathClear(p,{shape:new RAPIER.Ball(.1),from:vec(0,2,0),rotation:identity,to:vec(1,2,0)},external)).toBe(true);
      expect(contacts).not.toHaveBeenCalled();
    }finally{p.dispose();}
  });
  it('rejects tunneling through a convex wall from an initially overlapping pose',()=>{
    const p=new PhysicsManager();try{
      p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,.5,.5).setTranslation(0,2,0));
      expect(recoveryPathClear(p,{shape:new RAPIER.Ball(.1),from:vec(-.195,2,0),rotation:identity,to:vec(.3,2,0)},external)).toBe(false);
      expect(recoveryPathClear(p,{shape:new RAPIER.Ball(.1),from:vec(-.195,2,0),rotation:identity,to:vec(-.4,2,0)},external)).toBe(true);
    }finally{p.dispose();}
  });
  it('a supporting face cannot authorize a destination penetrating below the floor',()=>{
    const p=new PhysicsManager();try{
      expect(recoveryPathClear(p,{shape:new RAPIER.Ball(.1),from:vec(0,.1,0),rotation:identity,to:vec(.2,.05,0)},external)).toBe(false);
    }finally{p.dispose();}
  });
  it('allows a clear upright path from a supporting floor',()=>{
    const p=new PhysicsManager();try {
      expect(recoveryPathClear(p,{shape:new RAPIER.Ball(.1),from:vec(0,.1,0),rotation:identity,to:vec(0,.6,0)},external)).toBe(true);
    }finally{p.dispose();}
  });
});
