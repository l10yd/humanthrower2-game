import type {Part} from '../../src/physics/PhysicsManager';
import type {Game} from '../../src/core/Game';
import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
test('capture natural recovery barrier and test bounded coordinated plan without mutation',async({page})=>{
 await page.goto('/?art=off');await page.waitForFunction(()=>!!window.humanthrower);
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite diagnostic module
  const {probeIslandTranslation}=await import('/src/player/RecoveryRouteProbe.ts');
  // @ts-expect-error Vite diagnostic module
  const {planCoordinatedRecovery}=await import('/src/player/CoordinatedRecovery.ts');
  // @ts-expect-error Vite fixture
  const {runBalanceSession}=await import('/tests/fixtures/BalanceSession.ts');
  let captured:unknown=null;
  const report=runBalanceSession(window.humanthrower,93,'saw',21,{setup:(g:Game)=>{
   g.physics.recoveryTranslationCheck=(members,delta,volumes,center)=>{
    if(captured)return false;
    const bytes=g.physics.world.takeSnapshot(),work={narrowTests:0,candidates:0,closureRounds:0,exhausted:false},start=performance.now();
    const plan=planCoordinatedRecovery(g.physics,members[0],[...volumes],center,work,2000),elapsed=performance.now()-start;
    const after=g.physics.world.takeSnapshot();
    captured={time:g.now,members:members.map(p=>p.id),delta,probe:probeIslandTranslation(g.physics,members,delta),work,elapsed,plan:plan?{parts:plan.parts.map((p:Part)=>p.id),delta:plan.delta}:null,unchanged:bytes.every((b,i)=>b===after[i])};
    return false;
   };
  },afterTick:()=>!!captured});
  return {scope:'Bounded coordinated planning at natural seed93 barrier, no mutation/adoption',report,captured};
 });
 const output=resolve(process.env.HUMANTHROWER_ROUTE_OUTPUT??'.pi/mvp10-bounded-route.json');await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2));
 expect(result.report.error).toBeNull();expect(result.captured).not.toBeNull();expect((result.captured as {unchanged:boolean}).unchanged).toBe(true);console.log(JSON.stringify({output,captured:result.captured}));
});
