import {beforeAll,it,expect,vi} from 'vitest';
import {CONFIG} from '../../src/core/Config';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {PlayerController} from '../../src/player/PlayerController';
import {RagdollFactory} from '../../src/physics/RagdollFactory';
import {LivingNpcs,dropOptions,DROP_FORMS} from '../../src/npc/LivingNpcs';
import {WeaponController} from '../../src/gameplay/WeaponController';
import {SawController} from '../../src/gameplay/SawController';
import {box} from '../../src/slicing/ConvexClipper';
import {vec,identity} from '../../src/slicing/Math';
const idle={axis:0,stomp:false,pressed:false,released:false};
beforeAll(async()=>{await RAPIER.init();});
it('airborne ragdoll has no QTE, landed taps drive pose and 100% starts the guaranteed rise',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);let now=0;
 const step=(tap=false)=>{p.snapshot();c.update({...idle,pressed:tap,jumpPresses:tap?1:0},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{c.collider.setEnabled(false);c.ragdoll.knockDown(vec(0,5,0),vec(0,-1,0),0);
  for(let i=0;i<25;i++)step(true);expect(c.qte.active).toBe(false);expect(c.qte.effort).toBe(0);
  for(let i=0;i<150&&!c.qte.active;i++)step();expect(c.qte.active).toBe(true);
  const before=c.ragdoll.poseProgress;step(true);expect(c.ragdoll.poseProgress).toBeGreaterThan(before);expect(c.ragdoll.effortPulse).toBe(1);
  for(let i=0;i<400&&c.ragdoll.down;i++)step(i%3===0);
  console.log({qte:c.qte.snapshot,position:c.current,state:c.state,down:c.ragdoll.down,pose:c.ragdoll.poseProgress});
  expect(c.ragdoll.down).toBe(false);expect(c.qte.progress).toBe(1);expect(c.collider.isEnabled()).toBe(true);
 }finally{c.dispose();p.dispose();}
});
it('only substantial repeated impacts roll back rising effort and interrupt the pose',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);try{c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),0);for(let i=0;i<25;i++){c.update(idle,i/60,CONFIG.dt);p.step();c.afterStep((i+1)/60);}
  c.qte.effort=.8;c.qte.progress=.8;c.ragdoll.qteProgress=.8;
  c.knockDownFromAttack(2,8,1);expect(c.qte.effort).toBe(.8);c.knockDownFromAttack(50,8,1);expect(c.qte.effort).toBeLessThan(.6);expect(c.qte.phase).toBe('INTERRUPTED');expect(c.qte.rollback).toBeGreaterThan(.2);
 }finally{c.dispose();p.dispose();}
});
it('rotor flies while held, slices nearby falling bodies and stops on release',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),saw=new SawController(p,c,true),w=new WeaponController(p,c,saw);try{
  w.select('rotor');const center=vec(0,c.current.y+CONFIG.player.height*.42+.25,0);const target=p.createPart(box(.5,.3,.3),{position:center,rotation:identity},25,1,'chest');target.body.setLinvel(vec(0,-8,0),true);
  w.update({...idle,saw:true},CONFIG.dt);expect(w.rotorCuts).toBeGreaterThan(0);expect(p.parts.has(target.id)).toBe(false);expect(c.flight).toBe(true);const y=c.current.y;
  for(let i=0;i<35;i++){w.update({...idle,saw:true},CONFIG.dt);c.update(idle,i/60,CONFIG.dt);p.step();c.afterStep((i+1)/60);}expect(c.current.y).toBeGreaterThan(y+.5);
  w.update(idle,CONFIG.dt);expect(c.flight).toBe(false);
 }finally{c.dispose();p.dispose();}
});
it('giant head auto-selects nearby ragdoll food without requiring a surviving arm',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),w=new WeaponController(p,c,new SawController(p,c,true));try{
  c.damage.parts['upperArm1']=0;c.damage.parts['upperArm-1']=0;w.select('svarlHead');const target=p.createPart(box(.2,.2,.2),{position:vec(1,c.current.y+.8,0),rotation:identity},4,1,'head');w.update({...idle,saw:true},CONFIG.dt);
  expect(w.unavailable).toBe(false);expect(w.bites).toBe(1);expect(p.parts.has(target.id)).toBe(false);expect(w.eatenMass).toBeGreaterThan(0);
 }finally{c.dispose();p.dispose();}
});
it('living NPC flails, detached arms are passive, severing its head stops active behavior',()=>{
 const p=new PhysicsManager(),f=new RagdollFactory(p),ai=new LivingNpcs(p);try{
  const parts=f.spawn('normal',vec(0,4,0),identity,false)!;ai.register(parts,0);for(let i=0;i<20;i++){ai.update(i/60,CONFIG.dt,vec(2,1,0));p.step();}expect(ai.snapshot.airStrokes).toBeGreaterThan(0);
  const neck=[...p.joints.values()].find(j=>p.parts.get(j.b)?.limb==='head')!;p.removeJoint(neck.id);ai.update(1,CONFIG.dt,vec());expect(ai.snapshot.living).toBe(0);expect(parts.every(part=>p.parts.has(part.id))).toBe(true);
 }finally{p.dispose();}
});
it('missing limbs and actual half-body hulls spawn as distinct retained physics forms',()=>{
 for(const form of DROP_FORMS){const p=new PhysicsManager(),f=new RagdollFactory(p);try{const options=dropOptions(f,'normal',form),parts=f.spawn('normal',vec(0,4,0),identity,false,options)!;expect(parts.length).toBeGreaterThan(0);if(form!=='whole')expect(parts.length).toBeLessThan(11);if(form.includes('half'))expect(parts.some(part=>part.poly.faces.some(face=>face.cap))).toBe(true);}finally{p.dispose();}}
 expect(CONFIG.survival.airSeconds).toBe(5);
});
