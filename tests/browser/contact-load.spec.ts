import { test,expect } from '@playwright/test';
test('optional contact-load observer measures a shared bridge in Chromium without changing the world',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module fixture URL
  const {PhysicsManager,RAPIER}=await import('/src/physics/PhysicsManager.ts');
  // @ts-expect-error Vite module fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  // @ts-expect-error Vite module fixture URL
  const {pileLoad}=await import('/src/player/PileLoad.ts');
  const physics=new PhysicsManager(),control=new PhysicsManager();
  try{
   physics.contactLoadDiagnosticsEnabled=true;
   const builds=[physics,control].map(p=>{
    const player=p.createPart(box(.25,.1,.4),{position:{x:-.7,y:.6,z:0},rotation:{x:0,y:0,z:0,w:1}},32,0,'support',0,undefined,'player');player.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
    p.world.createCollider(RAPIER.ColliderDesc.cuboid(.25,.1,.4).setTranslation(.7,.6,0));
    const beam=p.createPart(box(.95,.12,.3),{position:{x:0,y:.86,z:0},rotation:{x:0,y:0,z:0,w:1}},72,1,'beam');return {player,beam};
   });
   let samples=0,mass=0,unchanged=true;
   for(let i=0;i<360;i++){
    if(i>=240)for(const b of builds)b.beam.body.wakeUp();physics.step();control.step();
    for(const [id,p]of physics.parts){const c=control.parts.get(id)!;unchanged&&=JSON.stringify([p.body.translation(),p.body.rotation(),p.body.linvel(),p.body.angvel(),p.body.isSleeping()])===JSON.stringify([c.body.translation(),c.body.rotation(),c.body.linvel(),c.body.angvel(),c.body.isSleeping()]);}
    if(i>=240){const snapshot=physics.contactLoad.snapshot;if(snapshot.complete&&snapshot.solvedContacts){samples++;mass+=snapshot.equivalentMass;}}
   }
   const shared=mass/(samples||1),estimate=pileLoad(physics,[builds[0].player]),sample=physics.contactLoad.snapshot;
   for(let i=0;i<240;i++)physics.step();const sleeping=physics.contactLoad.snapshot;
   return {shared,estimate,samples,unchanged,sample,sleeping,disabled:control.contactLoad.snapshot,gameDefault:window.humanthrower.physics.contactLoadDiagnosticsEnabled};
  }finally{physics.dispose();control.dispose();}
 });
 expect(result.samples).toBe(120);expect(result.shared).toBeGreaterThan(30);expect(result.shared).toBeLessThan(42);expect(result.estimate).toBeCloseTo(72,0);expect(result.unchanged).toBe(true);expect(result.sample.duration).toBeCloseTo(1/60,10);expect(result.gameDefault).toBe(false);expect(result.disabled.duration).toBe(0);expect(result.sleeping.stalePairs).toBeGreaterThan(0);expect(result.sleeping.complete).toBe(false);expect(errors).toEqual([]);
});
