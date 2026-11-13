import { beforeAll, describe, expect, it } from 'vitest';
import { RAPIER, PhysicsManager } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { axisAngle, vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
describe('Gate 0: Rapier pinned generic limits and pile',()=>{
  it('creates 11 parts / 10 constrained joints and 72 kg',()=>{const p=new PhysicsManager();try{
    const f=new RagdollFactory(p);f.spawn('normal',vec(0,3,0),axisAngle(vec(0,0,1),.6));
    expect(p.parts.size).toBe(11);expect(p.joints.size).toBe(10);
    expect([...p.parts.values()].reduce((s,b)=>s+b.body.mass(),0)).toBeCloseTo(72,1);
    for(const j of p.joints.values()) if(!j.hinge)for(let i=0;i<3;i++){
      expect(p.world.impulseJoints.raw.jointLimitsEnabled(j.handle,RAPIER.JointAxis.AngX+i)).toBe(true);
      expect(p.world.impulseJoints.raw.jointLimitsMin(j.handle,RAPIER.JointAxis.AngX+i)).toBeCloseTo(j.limits[i][0],5);
    }
    for(let i=0;i<600;i++)p.step();expect(p.numericFaults).toBe(0);expect(Math.max(...p.anchorDrifts())).toBeLessThan(.1);
  }finally{p.dispose();}});
  it('20 sequential drops remain finite, settle, and keep anchors',()=>{const p=new PhysicsManager(false,11);p.diagnosticsEnabled=true;try{
    const f=new RagdollFactory(p);let maxDrift=0;const steps:number[]=[];
    for(let n=0;n<20;n++) {
      const parts=f.spawn('normal',vec((n%5-2)*1.5,12.5,0),axisAngle(vec(0,0,1),n%2?.8:-.8));expect(parts).not.toBeNull();
      for(let i=0;i<160;i++){p.step();steps.push(p.stepMs);maxDrift=Math.max(maxDrift,...p.anchorDrifts());}
    }
    for(let i=0;i<600;i++)p.step();
    const calm=[...p.parts.values()].filter(b=>b.body.isSleeping()||Math.hypot(...Object.values(b.body.linvel()))<.08).length/p.parts.size;
    steps.sort((a,b)=>a-b);console.log(JSON.stringify({parts:p.parts.size,maxSpeed:p.maxSpeed,limb:p.maxAngularLimb,maxAngularSpeed:p.maxAngularSpeed,maxDrift,calm,physicsP95:steps[Math.floor(steps.length*.95)]}));
    for(const [name,snapshot]of [['first',p.faultSnapshot],['angularPeak',p.peakAngularFault],['energyPeak',p.peakEnergyFault]] as const)if(snapshot){
      console.log(JSON.stringify({impact:name,time:snapshot.time,limb:snapshot.limb,angular:snapshot.angular,energyDelta:snapshot.energyDelta,
        ignoredOverlaps:snapshot.contacts.filter(c=>c.filtered&&c.distance<0).length,solverPairs:snapshot.solverContacts.filter(c=>c.solver.length).length,
        joints:snapshot.joints.map(j=>({id:j.id,before:j.before,after:j.after}))}));
    }
    expect(p.numericFaults).toBe(0);expect(p.maxSpeed).toBeLessThan(25);expect(p.maxAngularSpeed).toBeLessThan(35);
    expect(maxDrift).toBeLessThan(.1);expect(calm).toBeGreaterThanOrEqual(.9);
  }finally{p.dispose();}});
});
