import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { axisAngle, vec } from '../../src/slicing/Math';
import { box, vertices } from '../../src/slicing/ConvexClipper';
import { replayImpact } from '../../src/physics/ImpactReplay';
import { mechanicalEnergy } from '../../src/physics/Diagnostics';
beforeAll(async()=>{await RAPIER.init();});
describe('impact snapshots are observational and replayable on this pinned engine',()=>{
  it('captures first + peak faults, distinguishes filtered geometry, and replays the peak step',()=>{
    const p=new PhysicsManager();p.diagnosticsEnabled=true;p.diagnosticsReplayEnabled=true;
    const control=new PhysicsManager();
    try {
      const pose=vec(-3,12.5,0),rotation=axisAngle(vec(0,0,1),-.8);
      new RagdollFactory(p).spawn('normal',pose,rotation);
      new RagdollFactory(control).spawn('normal',pose,rotation);
      for(let i=0;i<160;i++){p.step();control.step();}
      expect(p.maxAngularSpeed).toBe(control.maxAngularSpeed);expect(p.maxSpeed).toBe(control.maxSpeed);
      const first=p.faultSnapshot!;
      // Self contacts can remove the old angular failure entirely for this drop.
      // Replay the angular peak when present, otherwise the first threshold event.
      const peak=p.peakAngularFault??p.faultSnapshot!;
      expect(first).not.toBeNull();expect(peak).not.toBeNull();
      if(p.peakAngularFault)expect(peak.angular).toBe(p.maxAngularSpeed);
      expect(peak.time).toBeGreaterThanOrEqual(first.time);
      // The first impact's overlapping neighbors depend on damping/pose. Filtering
      // itself is verified below using deliberate connected overlap, not a lucky pose.
      expect(first.solverContacts.some(c=>c.otherId==='static'&&c.solver.length>0)).toBe(true);
      for(const contact of first.solverContacts.filter(c=>c.partId===first.partId&&c.solver.length>0)) {
        const geometry=first.contacts.find(c=>c.otherId===contact.otherId);
        if(geometry)expect(geometry.filtered).toBe(false);
      }
      expect(peak.joints.every(j=>Number.isFinite(j.before.anchorDrift+j.after.anchorDrift)&&j.before.twistMotion.every(m=>m.rate===null||Number.isFinite(m.rate)))).toBe(true);
      const replay=replayImpact(peak);
      for(const state of peak.world){const actual=replay.find(b=>b.id===state.id)!;
        expect(actual.position).toEqual(state.after.position);expect(actual.rotation).toEqual(state.after.rotation);
        expect(actual.velocity).toEqual(state.after.velocity);expect(actual.angular).toEqual(state.after.angular);
      }
      const frozen=JSON.stringify(first);for(let i=0;i<10;i++){p.step();control.step();}expect(JSON.stringify(first)).toBe(frozen);
      for(const part of p.parts.values())expect(part.body.translation()).toEqual(control.parts.get(part.id)!.body.translation());
    } finally {p.dispose();control.dispose();}
    expect(p.faultSnapshot).toBeNull();expect(p.peakAngularFault).toBeNull();
  });
  it('labels deliberately overlapping connected geometry as filtered, not solved',()=>{
    const p=new PhysicsManager();p.diagnosticsEnabled=true;
    try{
      const a=p.createPart(box(.2,.2,.2),{position:vec(0,4,0),rotation:axisAngle(vec(0,0,1),0)},3,0,'overlapA',0,undefined,'player');
      const b=p.createPart(box(.2,.2,.2),{position:vec(.1,4,0),rotation:axisAngle(vec(0,0,1),0)},3,0,'overlapB',0,undefined,'player');
      p.createJoint({a:a.id,b:b.id,anchorA:vec(.05,0,0),anchorB:vec(-.05,0,0),axis:vec(1,0,0),hinge:false,limits:[[-1,1],[-1,1],[-1,1]]});
      a.body.setLinvel(vec(30,0,0),true);b.body.setLinvel(vec(30,0,0),true);p.step();
      const fault=p.faultSnapshot!;expect(fault).not.toBeNull();expect(fault.contacts.some(c=>c.filtered&&c.distance<0)).toBe(true);
      expect(fault.solverContacts.some(c=>c.otherId===b.id&&c.solver.length>0)).toBe(false);
    }finally{p.dispose();}
  });
  it('captures and replays a first-substep spike even when it has decayed below threshold by tick end',()=>{
    const p=new PhysicsManager();p.diagnosticsEnabled=true;p.diagnosticsReplayEnabled=true;
    try{
      const part=p.createPart(box(.2,.2,.2),{position:vec(0,5,0),rotation:axisAngle(vec(0,0,1),0)},3,1,'substepFixture');
      part.body.setGravityScale(0,true);part.body.setAngularDamping(120);part.body.setAngvel(vec(0,0,100),true);
      const kinematic=p.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(3,4,0));
      kinematic.setNextKinematicTranslation(vec(3.1,4,0));
      p.step();const fault=p.peakAngularFault!;
      expect(fault).not.toBeNull();expect(fault.substepIndex).toBe(0);expect(fault.replayTimestep).toBeCloseTo(1/120,10);
      // Rapier also bounds rotational integration internally; do not assume the
      // textbook damping formula yields an exact 50rad/s. The regression is about
      // capturing the >35 first-substep event that the final sample would miss.
      expect(fault.angular).toBeGreaterThan(35);expect(fault.angular).toBeLessThan(100);expect(p.maxAngularSpeed).toBe(fault.angular);
      expect(Math.hypot(...Object.values(part.body.angvel()))).toBeLessThan(35);
      expect(fault.time).toBeCloseTo(1/120,10);expect(fault.fixedTime).toBe(0);
      const replay=replayImpact(fault);expect(replay.find(b=>b.id===part.id)!.angular).toEqual(fault.after.angular);
      expect(kinematic.translation().x).toBeCloseTo(3.1,5);
    }finally{p.dispose();}
  });
  it('does not serialize when replay capture is off, and uses fragment COM',()=>{
    const p=new PhysicsManager();p.diagnosticsEnabled=true;
    try {
      const serialize=vi.spyOn(p.world,'takeSnapshot');
      const poly=box(.1,.2,.1);for(const point of vertices(poly))point.y+=.5;
      const part=p.createPart(poly,{position:vec(0,5,0),rotation:axisAngle(vec(0,0,1),0)},2,1,'offset-fragment');
      part.body.setLinvel(vec(30,0,0),true);p.step();
      const fault=p.faultSnapshot!;expect(fault).not.toBeNull();expect(fault.replayBefore).toBeNull();expect(serialize).not.toHaveBeenCalled();
      expect(fault.before.com.y-fault.before.position.y).toBeCloseTo(.5);
      expect(fault.energyBefore).toBeCloseTo(mechanicalEnergy([fault.before]));
      expect(fault.energyAfter).toBeCloseTo(mechanicalEnergy([fault.after]));
    } finally {p.dispose();}
  });
});
