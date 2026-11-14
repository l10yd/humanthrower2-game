import {beforeAll,expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {RAPIER} from '../../src/physics/PhysicsManager';
beforeAll(async()=>{await RAPIER.init();});
it('retained thin contact replay obeys original strict velocity gates for the entire world',async()=>{
 const manifest=JSON.parse(await readFile('tests/fixtures/thin-contact-impact.json','utf8'));
 const bytes=new Uint8Array(await readFile('tests/fixtures/thin-contact-impact.bin'));
 const world=RAPIER.World.restoreSnapshot(bytes),queue=new RAPIER.EventQueue(true);
 try{
  const lookup=new Map(manifest.world.map((p:any)=>[p.colliderHandle,p])),key=(a:number,b:number)=>`${Math.min(a,b)}:${Math.max(a,b)}`;
  const excluded=new Set([...manifest.neighborPairs,...manifest.deferredPairs].map((p:any)=>key(p.a,p.b)));
  world.timestep=manifest.replayTimestep;
  world.step(queue,{filterContactPair:(a,b)=>{
   const pa=lookup.get(a) as any,pb=lookup.get(b) as any;
   if(pa&&pb&&(excluded.has(key(pa.id,pb.id))||(!manifest.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component))return null;
   return RAPIER.SolverFlags.COMPUTE_IMPULSE;
  },filterIntersectionPair:()=>true});
  const states=manifest.world.map((p:any)=>world.getRigidBody(p.bodyHandle)),speed=Math.max(...states.map((b:any)=>Math.hypot(...Object.values(b.linvel()) as number[]))),angular=Math.max(...states.map((b:any)=>Math.hypot(...Object.values(b.angvel()) as number[])));
  expect(Number.isFinite(speed+angular)).toBe(true);expect.soft(speed).toBeLessThan(25);expect.soft(angular).toBeLessThan(35);
 }finally{queue.free();world.free();}
});
