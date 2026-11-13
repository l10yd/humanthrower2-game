import { test,expect } from '@playwright/test';
test('real browser KCC landing shares one pressure budget between two dynamic supports',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture module URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  // @ts-expect-error Vite fixture module URL
  const {CONFIG}=await import('/src/core/Config.ts');
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;
  const parts=[-.25,.25].map((x,i)=>g.physics.createPart(box(.24,.1,.5),{position:{x,y:.1,z:0},rotation:{x:0,y:0,z:0,w:1}},80,i+1,'support'));
  for(let i=0;i<20;i++)g.physics.step();
  const calls:number[][]=parts.map(()=>[]),originals=parts.map(p=>p.body.applyImpulse.bind(p.body));
  parts.forEach((p,i)=>{p.body.applyImpulse=(impulse,wake)=>{calls[i].push(-impulse.y);originals[i](impulse,wake);};});
  try{
   const center={x:0,y:1.65,z:0};g.player.current={...center};g.player.previous={...center};g.player.body.setTranslation(center,true);g.player.body.setNextKinematicTranslation(center);g.player.jump.vy=-24;g.physics.world.propagateModifiedBodyPositionsToColliders();
   for(let i=0;i<3&&!g.player.grounded;i++){g.player.update({axis:0,pressed:false,released:false,stomp:false},1+i*CONFIG.dt,CONFIG.dt);g.physics.step();g.player.afterStep(1+(i+1)*CONFIG.dt);}
   const landing=calls.map(c=>c.filter((_,i)=>i%2===1));
   return {grounded:g.player.grounded,landing,weight: calls.reduce((s,c)=>s+c.filter((_,i)=>i%2===0).reduce((n,v)=>n+v,0),0),limits:CONFIG.playerContact,recordVersion:g.recordProfile.rulesVersion,allDynamic:parts.every(p=>p.body.isDynamic())};
  }finally{parts.forEach((p,i)=>{p.body.applyImpulse=originals[i];});}
 });
 expect(result.grounded).toBe(true);expect(result.allDynamic).toBe(true);expect(result.recordVersion).toBe('3.2-mass-aware-support-pressure');
 expect(result.landing.flat().reduce((s,n)=>s+n,0)).toBeGreaterThan(0);expect(result.landing.flat().reduce((s,n)=>s+n,0)).toBeLessThanOrEqual(result.limits.landingTotal+1e-6);expect(result.landing.flat().every(n=>n<=result.limits.landingPerBody+1e-6)).toBe(true);expect(result.weight).toBeCloseTo(64*9.81/60,4);
});

test('real sleeping NPC pile supports twenty normal jumps and bounded disturbances in Chromium',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture module URL
  const {RagdollFactory}=await import('/src/physics/RagdollFactory.ts');
  // @ts-expect-error Vite fixture module URL
  const {randomSeed,CONFIG}=await import('/src/core/Config.ts');
  // @ts-expect-error Vite fixture module URL
  const {RAPIER}=await import('/src/physics/PhysicsManager.ts');
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;
  const p=g.physics,factory=new RagdollFactory(p,2,2),random=randomSeed(17),idle={axis:0,pressed:false,released:false,stomp:false};
  // Player is not in the drop zone while preparing the fixture, but its original
  // KCC and impact detection stay enabled during the actual exercise below.
  g.player.collider.setEnabled(false);
  for(let n=0;n<6;n++){
   const angle=(random()-.5)*2.6,parts=factory.spawn(n%3===0?'heavy':'normal',{x:(n%3-1)*1.25,y:7+n%2,z:0},{x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)});
   if(!parts)throw Error('fixture spawn blocked');for(let i=0;i<150;i++){p.step();g.now+=CONFIG.dt;}
  }
  for(let i=0;i<300;i++){p.step();g.now+=CONFIG.dt;}
  let top=-Infinity;
  p.world.forEachCollider(c=>{if(p.partForCollider(c)?.owner!=='npc')return;const t=c.castRay(new RAPIER.Ray({x:0,y:10,z:0},{x:0,y:-1,z:0}),10,true);if(t>=0&&Number.isFinite(t))top=Math.max(top,10-t);});
  if(!Number.isFinite(top))throw Error('fixture has no support');
  const sleeping=[...p.parts.values()].filter(b=>b.body.isSleeping()).length,ids=[...p.parts.keys()],mass=[...p.parts.values()].reduce((s,b)=>s+b.body.mass(),0),joints=p.joints.size;
  const center={x:0,y:top+CONFIG.player.height/2+.1,z:0};g.player.current={...center};g.player.previous={...center};g.player.body.setTranslation(center,true);g.player.body.setNextKinematicTranslation(center);g.player.collider.setEnabled(true);p.world.propagateModifiedBodyPositionsToColliders();
  const step=(pressed=false)=>{p.snapshot();g.player.update({...idle,pressed},g.now,CONFIG.dt);p.step();g.now+=CONFIG.dt;g.player.afterStep(g.now);};
  for(let i=0;i<120&&!g.player.grounded;i++)step();
  p.maxSpeed=p.maxAngularSpeed=0;let landed=0,peakPenetration=0;
  for(let cycle=0;cycle<20;cycle++){
   if(cycle%5===0){const support=[...p.parts.values()].find(b=>{const c=b.collider.contactShape(g.player.collider.shape,{x:g.player.current.x,y:g.player.current.y-.08,z:0},{x:0,y:0,z:0,w:1},.1);return c&&c.normal1.y>.66&&c.distance<.02;});if(!support)throw Error('no NPC support');support.body.applyImpulse({x:cycle%10===0?2:-2,y:0,z:0},true);}
   const y=g.player.current.y;step(true);let peak=y,grounded=false;
   for(let i=0;i<180;i++){step();peak=Math.max(peak,g.player.current.y);if(g.player.ragdoll.down)throw Error('unexpected knockdown');if(i>25&&g.player.grounded){grounded=true;break;}}
   if(!grounded||peak-y<=.7)throw Error('jump failed');step();
   let support=false;
   for(const b of p.parts.values()){
    const c=b.collider.contactShape(g.player.collider.shape,{x:g.player.current.x,y:g.player.current.y-.08,z:0},{x:0,y:0,z:0,w:1},.1);if(c&&c.normal1.y>.66&&c.distance<.02)support=true;
    const direct=b.collider.contactCollider(g.player.collider,0);if(direct)peakPenetration=Math.max(peakPenetration,-direct.distance);
   }
   if(support)landed++;
  }
  return {landed,sleeping,peakPenetration,allDynamic:[...p.parts.values()].every(b=>b.body.isDynamic()),idsPreserved:JSON.stringify([...p.parts.keys()])===JSON.stringify(ids),jointsPreserved:p.joints.size===joints,massDelta:[...p.parts.values()].reduce((s,b)=>s+b.body.mass(),0)-mass,knockdowns:g.player.ragdoll.knockdowns,snapshot:g.debugSnapshot()};
 });
 await testInfo.attach('kcc-real-pile.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 expect(result.sleeping).toBe(66);expect(result.landed).toBe(20);expect(result.peakPenetration).toBeLessThan(.06);expect(result.allDynamic).toBe(true);expect(result.idsPreserved).toBe(true);expect(result.jointsPreserved).toBe(true);expect(result.massDelta).toBeCloseTo(0,4);expect(result.knockdowns).toBe(0);expect(result.snapshot.grounded).toBe(true);expect(result.snapshot.numericFaults).toBe(0);expect(result.snapshot.maxSpeed).toBeLessThan(25);expect(result.snapshot.maxAngularSpeed).toBeLessThan(35);expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/kcc-real-pile.png'});
});
