import { beforeAll,it,expect } from 'vitest';
import { CONFIG,randomSeed } from '../../src/core/Config';
import { PhysicsManager,RAPIER,type Part } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { PlayerController } from '../../src/player/PlayerController';
import { axisAngle,identity,vec } from '../../src/slicing/Math';
const idle={axis:0,stomp:false,pressed:false,released:false};
beforeAll(async()=>{await RAPIER.init();});
for(const seed of [17,42])it(`KCC real settled NPC pile ${seed}: 100 jumps retain collidable dynamic supports`,()=>{
 const p=new PhysicsManager(false,11),factory=new RagdollFactory(p,2,2),random=randomSeed(seed);let player:PlayerController|undefined,now=0;
 try{
  for(let n=0;n<6;n++){
   const parts=factory.spawn(n%3===0?'heavy':'normal',vec((n%3-1)*1.25,7+n%2,0),axisAngle(vec(0,0,1),(random()-.5)*2.6));expect(parts).not.toBeNull();
   for(let i=0;i<150;i++){p.step();now+=CONFIG.dt;}
  }
  for(let i=0;i<300;i++){p.step();now+=CONFIG.dt;}
  const ids=[...p.parts.keys()],joints=p.joints.size,initialMass=[...p.parts.values()].reduce((s,b)=>s+b.body.mass(),0);
  const ray=new RAPIER.Ray(vec(0,10,0),vec(0,-1,0)),hit=p.world.castRayAndGetNormal(ray,10,true,undefined,undefined,undefined,undefined,c=>p.partForCollider(c)?.owner==='npc');expect(hit).not.toBeNull();
  const sleepingBeforePlayer=[...p.parts.values()].filter(part=>part.body.isSleeping()).map(part=>part.id);
  player=new PlayerController(p);
  const center=vec(0,ray.origin.y-hit!.timeOfImpact+CONFIG.player.height/2+.1,0);player.current={...center};player.previous={...center};player.body.setTranslation(center,true);player.body.setNextKinematicTranslation(center);p.world.propagateModifiedBodyPositionsToColliders();
  const step=(pressed=false)=>{p.snapshot();player!.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;player!.afterStep(now);};
  for(let i=0;i<120&&!player.grounded;i++)step();expect(player.grounded).toBe(true);expect(player.ragdoll.down).toBe(false);
  // Preparation fall peaks belong to the separate, still-open angular gate.
  const preparation={speed:p.maxSpeed,angular:p.maxAngularSpeed};
  expect(preparation.speed).toBeLessThan(25);expect(preparation.angular).toBeLessThan(35);p.maxSpeed=p.maxAngularSpeed=0;
  const placementWake=sleepingBeforePlayer.filter(id=>!p.parts.get(id)!.body.isSleeping()).length;
  let npcLandings=0,peakPenetration=0,disturbedCycles=0;
  const contactFor=(part:Part)=>part.collider.contactShape(player!.collider.shape,vec(player!.current.x,player!.current.y-.08,0),identity,.1);
  for(let cycle=0;cycle<100;cycle++){
   // Keep Rapier's natural sleep state. Forcing all bodies asleep while joints
   // still move would reset real velocities and is not an ordinary pile fixture.
   if(cycle%10===0){
    const support=[...p.parts.values()].find(part=>{const c=contactFor(part);return c&&c.normal1.y>.66&&c.distance<.02;});
    expect(support).toBeDefined();support!.body.applyImpulse(vec(cycle%20===0?2:-2,0,0),true);disturbedCycles++;
   }
   const startY=player.current.y;step(true);let peak=startY,landed=false;
   for(let i=0;i<180;i++){
    step();peak=Math.max(peak,player.current.y);expect(player.ragdoll.down).toBe(false);expect(player.current.y).toBeGreaterThan(CONFIG.player.height/2-.02);
    if(i>25&&player.grounded){landed=true;break;}
   }
   expect(peak-startY).toBeGreaterThan(.7);expect(landed).toBe(true);
   step();
   let supported=false;
   const probe=vec(player.current.x,player.current.y-.08,0);
   for(const part of p.parts.values()){
    // Snap permits a real capsule gap: validate its downward support footprint.
    const contact=part.collider.contactShape(player.collider.shape,probe,identity,.1);
    if(contact&&contact.normal1.y>.66&&contact.distance<.02)supported=true;
    const direct=part.collider.contactCollider(player.collider,0);if(direct)peakPenetration=Math.max(peakPenetration,-direct.distance);
    expect(part.body.isDynamic()).toBe(true);
   }
   if(supported)npcLandings++;
  }
  console.log(JSON.stringify({seed,jumps:100,npcLandings,sleepingBeforePlayer:sleepingBeforePlayer.length,placementWake,disturbedCycles,peakPenetration,preparation,exercise:{speed:p.maxSpeed,angular:p.maxAngularSpeed},player:player.current}));
  expect(disturbedCycles).toBe(10);expect(player.ragdoll.knockdowns).toBe(0);expect(player.collider.isEnabled()).toBe(true);
  if(seed===17){expect(sleepingBeforePlayer).toHaveLength(66);expect(placementWake).toBeGreaterThan(0);}
  expect(npcLandings).toBe(100);expect(peakPenetration).toBeLessThan(.06);expect(p.maxSpeed).toBeLessThan(25);expect(p.maxAngularSpeed).toBeLessThan(35);
  expect(p.numericFaults).toBe(0);expect([...p.parts.keys()]).toEqual(ids);expect(p.joints.size).toBe(joints);expect([...p.parts.values()].reduce((s,b)=>s+b.body.mass(),0)).toBeCloseTo(initialMass,4);
 }finally{player?.dispose();p.dispose();}
},60000);
