import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { box } from '../../src/slicing/ConvexClipper';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { axisAngle, identity, vec } from '../../src/slicing/Math';
import { clearRows } from '../../src/slicing/ClearTransaction';
import { OccupancyRaster } from '../../src/grid/OccupancyRaster';
const idle={axis:0,stomp:false,pressed:false,released:false};
beforeAll(async()=>{await RAPIER.init();});
function fixture() {
  const physics=new PhysicsManager(),player=new PlayerController(physics);let now=0;
  const step=(n:number,axis=0,effortPresses=0)=>{for(let i=0;i<n;i++){
    physics.snapshot();player.update({...idle,axis,effortPresses},now,CONFIG.dt);physics.step();now+=CONFIG.dt;player.afterStep(now);
  }};
  const drop=()=>physics.createPart(box(.32,.2,.2),{position:vec(player.current.x,4.8,0),rotation:identity},22,1,'chest');
  return {physics,player,step,drop,get now(){return now;},dispose(){player.dispose();physics.dispose();}};
}
describe('player impact / physical recovery',()=>{
  it('falling body triggers 11 dynamic parts, settles, and physically stands when free',()=>{
    const f=fixture();try {
      f.step(10);const npc=f.drop();let impactAt=0;
      for(let i=0;i<120;i++){f.step(1);if(f.player.ragdoll.down){impactAt=f.now;break;}}
      expect(impactAt).toBeGreaterThan(0);expect(f.player.state).toBe('RAGDOLL');expect(f.player.ragdoll.parts.length).toBe(11);
      expect(f.player.collider.isEnabled()).toBe(false);
      expect(f.player.ragdoll.parts.reduce((s,p)=>s+p.body.mass(),0)).toBeCloseTo(CONFIG.player.mass,1);
      f.step(20);f.physics.removePart(npc.id);
      const states=new Set<string>();for(let i=0;i<900;i++){f.step(1);states.add(f.player.state);if(f.player.state==='RECOVERING')break;}
      expect(states.has('GETTING_UP')).toBe(true);expect(f.player.state).toBe('RECOVERING');
      expect(f.player.collider.isEnabled()).toBe(true);expect(f.player.ragdoll.parts.length).toBe(0);
      const x=f.player.current.x;f.step(60,1);expect(f.player.current.x-x).toBeGreaterThan(.3);expect(f.player.current.x-x).toBeLessThan(2.1);
      f.step(120);expect(f.player.state).toBe('ACTIVE');expect(f.physics.numericFaults).toBe(0);
    }finally{f.dispose();}
  });
  it('a roof blocks standing, input crawls out physically and recovery resumes outside',()=>{
    const f=fixture();try{
      f.step(10);const npc=f.drop();for(let i=0;i<120&&!f.player.ragdoll.down;i++)f.step(1);
      // Wait for the detected impact to reach the new physical player parts.
      f.step(25);f.physics.removePart(npc.id);
      // Fixed overhead fixture is above the current head, not intersecting it.
      const roof=f.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(1,.1,.5).setTranslation(0,2.24,0));
      f.step(150);expect(f.player.ragdoll.down).toBe(true);expect(f.player.ragdoll.blocked).toBe(true);
      const before=f.player.current.x;f.step(240,1);
      expect(f.player.current.x).toBeGreaterThan(before+.3);
      // No forced standing inside the roof even after timeout.
      if(Math.abs(f.player.current.x)<1.2)expect(f.player.ragdoll.down).toBe(true);
      f.physics.world.removeCollider(roof,true);
      for(let i=0;i<900&&f.player.ragdoll.down;i++)f.step(1);
      expect(f.player.ragdoll.down).toBe(false);expect(f.physics.numericFaults).toBe(0);
    }finally{f.dispose();}
  });
  it('player never contributes coverage or gets sliced, and restart cleanup removes joints',()=>{
    const f=fixture();try{
      f.player.collider.setEnabled(false);f.player.ragdoll.knockDown(f.player.current,vec(),0);f.step(10);
      const ids=f.player.ragdoll.parts.map(p=>p.id),raster=new OccupancyRaster();
      expect(raster.rebuild(f.physics.parts.values()).every(r=>r.mean===0)).toBe(true);
      clearRows(f.physics,[0]);expect(ids.every(id=>f.physics.parts.has(id))).toBe(true);
      expect(f.physics.joints.size).toBe(10);f.player.ragdoll.dispose();expect(f.physics.parts.size).toBe(0);expect(f.physics.joints.size).toBe(0);
    }finally{f.dispose();}
  });
  it('a complete falling NPC knocks the player down and permits physical escape',()=>{
    const f=fixture();try {
      f.step(10);const factory=new RagdollFactory(f.physics);
      const npc=factory.spawn('normal',vec(0,4.8,0),axisAngle(vec(0,0,1),1.4))!;
      let down=false;
      for(let i=0;i<180;i++){f.step(1);if(f.player.ragdoll.down){down=true;break;}}
      expect(down).toBe(true);
      f.step(360,1);
      expect(f.player.ragdoll.knockdowns).toBeGreaterThanOrEqual(1);
      expect(f.physics.numericFaults).toBe(0);
      expect(npc.every(p=>f.physics.parts.has(p.id))).toBe(true);
      expect(f.player.current.x).toBeGreaterThan(.4);
      for(const p of npc)f.physics.removePart(p.id);
      for(let i=0;i<900&&f.player.ragdoll.down;i++)f.step(1);
      expect(f.player.ragdoll.down).toBe(false);
    }finally{f.dispose();}
  });
  it('several falling bodies retain physical contacts while the player escapes the pile',()=>{
    const f=fixture();try {
      f.step(10);const factory=new RagdollFactory(f.physics),parts=[];
      for(const [x,height,angle]of [[0,4.8,1.4],[-.35,6.3,1.2],[.4,7.8,-1.25]]) {
        const npc=factory.spawn('normal',vec(x,height,0),axisAngle(vec(0,0,1),angle));expect(npc).not.toBeNull();parts.push(...npc!);
      }
      for(let i=0;i<120&&!f.player.ragdoll.down;i++)f.step(1);
      expect(f.player.ragdoll.down).toBe(true);
      f.step(360,1);
      expect(f.player.current.x).toBeGreaterThan(.4);expect(f.physics.numericFaults).toBe(0);
      expect(parts.every(p=>f.physics.parts.has(p.id))).toBe(true);
      // Recovery still needs real clearance; removing the fixture loads opens it explicitly.
      for(const p of parts)f.physics.removePart(p.id);
      for(let i=0;i<900&&f.player.ragdoll.down;i++)f.step(1);
      expect(f.player.ragdoll.down).toBe(false);
    }finally{f.dispose();}
  });
  it('20 knockdown/recovery cycles remove all transient player bodies and joints',()=>{
    const f=fixture();try {
      for(let cycle=0;cycle<20;cycle++) {
        f.player.collider.setEnabled(false);f.player.ragdoll.knockDown(f.player.current,vec(),f.now);
        for(let i=0;i<600&&f.player.ragdoll.down;i++)f.step(1);
        expect(f.player.ragdoll.down).toBe(false);expect(f.physics.parts.size).toBe(0);expect(f.physics.joints.size).toBe(0);
      }
    }finally{f.dispose();}
  });
  it('repeated presses increase bounded effort and animate supported crawl without standing through a roof',()=>{
    const f=fixture();try{
      f.player.collider.setEnabled(false);f.player.ragdoll.knockDown(f.player.current,vec(),0);
      f.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(2,.1,.5).setTranslation(0,2.35,0));f.step(80);
      const motors=vi.spyOn(f.physics.world.impulseJoints.raw,'jointSetMotorMaxForce');
      for(let i=0;i<60;i++)f.step(1,1,i%6===0?1:0);
      expect(f.player.ragdoll.struggle).toBeGreaterThan(.5);expect(f.player.ragdoll.struggle).toBeLessThanOrEqual(1);
      expect(f.player.ragdoll.down).toBe(true);expect(f.player.collider.isEnabled()).toBe(false);
      expect(motors.mock.calls.some(([,axis,force])=>axis===3&&force>0&&force<=CONFIG.player.crawlTorque*2)).toBe(true);
      f.step(120);expect(f.player.ragdoll.struggle).toBeLessThan(.04);expect(f.physics.numericFaults).toBe(0);
    }finally{f.dispose();}
  });
  it('active pressing reduces a physically clear get-up time without changing handoff clearance',()=>{
    const run=(active:boolean)=>{const f=fixture();try{
      f.player.collider.setEnabled(false);f.player.ragdoll.knockDown(f.player.current,vec(),0);
      for(let i=0;i<900&&f.player.ragdoll.down;i++)f.step(1,0,active&&i%6===0?1:0);
      expect(f.player.ragdoll.down).toBe(false);expect(f.player.collider.isEnabled()).toBe(true);return f.now;
    }finally{f.dispose();}};
    const passive=run(false),active=run(true);console.log(JSON.stringify({passiveGetUp:passive,activeGetUp:active}));expect(active).toBeLessThan(passive);
  });
  it('a disappearing dynamic support cancels get-up rather than lifting the player in mid-air',()=>{
    const f=fixture();try{
      const support=f.physics.createPart(box(2,.1,.5),{position:vec(0,3,0),rotation:identity},100,1,'raised-support');support.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
      f.player.collider.setEnabled(false);f.player.ragdoll.knockDown(vec(0,4.3,0),vec(),0);
      for(let i=0;i<180&&f.player.state!=='GETTING_UP';i++)f.step(1);
      expect(f.player.state).toBe('GETTING_UP');f.physics.removePart(support.id);f.step(1);
      expect(f.player.state).toBe('CRAWLING');expect(f.player.ragdoll.down).toBe(true);
    }finally{f.dispose();}
  });
  it('airborne ragdoll cannot propel itself sideways or start standing without support',()=>{
    const f=fixture();try {
      f.player.collider.setEnabled(false);f.player.ragdoll.knockDown(vec(0,8,0),vec(),0);
      f.step(45,1);expect(f.player.ragdoll.down).toBe(true);expect(f.player.state).not.toBe('GETTING_UP');
      expect(Math.abs(f.player.current.x)).toBeLessThan(.01);expect(f.physics.numericFaults).toBe(0);
    }finally{f.dispose();}
  });
  it('standing under a resting load slows movement but a jump still attempts the physical sweep',()=>{
    const f=fixture();try {
      f.step(10);
      const load=f.physics.createPart(box(1.5,.1,.35),{position:vec(0,2.42,0),rotation:identity},22,1,'chest');
      load.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
      f.step(2);expect(f.player.underPressure).toBe(true);
      const x=f.player.current.x;f.step(45,1);
      expect(f.player.current.x-x).toBeGreaterThan(.1);expect(f.player.current.x-x).toBeLessThan(1.2);
      f.player.update({...idle,pressed:true},f.now,CONFIG.dt);
      expect(f.player.jump.vy).toBeGreaterThan(0);expect(f.player.ragdoll.knockdowns).toBe(0);
    }finally{f.dispose();}
  });
  it('resting and side contacts do not cause a knockdown',()=>{
    const f=fixture();try{
      f.step(10);f.physics.createPart(box(.2,.2,.2),{position:vec(.65,.4,0),rotation:identity},22,1,'chest');
      f.step(60,1);expect(f.player.ragdoll.knockdowns).toBe(0);
    }finally{f.dispose();}
  });
});
