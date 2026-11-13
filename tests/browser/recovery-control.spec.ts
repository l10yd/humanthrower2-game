import { test,expect } from '@playwright/test';
test('active saw grace never flashes QTE and permits a normal jump through movable cut halves',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;
  const idle={axis:0,pressed:false,released:false,stomp:false};
  for(let i=0;i<20;i++){g.player.update(idle,g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);}
  g.saw.aim={x:0,y:10,z:0};const y=g.player.current.y;
  const body=g.physics.createPart(box(.6,.3,.3),{position:{x:0,y:3.1,z:0},rotation:{x:0,y:0,z:0,w:1}},60,1,'incoming');body.body.setLinvel({x:0,y:-8,z:0},true);
  let peak=y,qteFrames=0,slowFrames=0;
  for(let i=0;i<90;i++){
   const input={...idle,axis:1,pressed:i===1,saw:true};g.saw.update(input,1/60);g.player.update(input,g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);
   peak=Math.max(peak,g.player.current.y);qteFrames+=Number(g.player.qte.active);slowFrames+=Number(g.player.underPressure);
  }
  return {snapshot:g.debugSnapshot(),qteFrames,slowFrames,rise:peak-y};
 });
 expect(result.snapshot.saw.interceptions).toBeGreaterThan(0);expect(result.qteFrames).toBe(0);expect(result.slowFrames).toBe(0);expect(result.snapshot.knockdowns).toBe(0);expect(result.rise).toBeGreaterThan(.8);
 await expect(page.locator('#get-up-qte')).toBeHidden();
});
test('100% recovery settles damaged legs into control and hides the completed panel',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;g.state='RUNNING';g.detector.arm(0,g.now);g.detector.rows[0].fireAt=g.now;
  (g as unknown as {fixedUpdate():void}).fixedUpdate();g.pause();
  const idle={axis:0,pressed:false,released:false,stomp:false},step=(pressed=false)=>{g.player.update({...idle,pressed},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);};
  // Cut recovery is automatic; test QTE on the next real damaged knockdown.
  for(let i=0;i<120;i++)step();
  g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},g.now);
  for(let i=0;i<30;i++)step();for(let i=0;i<80&&!g.player.qte.ready;i++)step(true);
  if(!g.player.qte.ready)throw Error('damaged QTE did not fill');
  for(let i=0;i<60&&g.player.ragdoll.down;i++)step();
  return g.debugSnapshot();
 });
 expect(result.damage.alive).toBe(true);expect(result.qte.active).toBe(false);expect(result.qte.escapes).toBe(1);expect(result.playerState).not.toBe('GETTING_UP');
 await expect(page.locator('#get-up-qte')).toBeHidden();await expect(page.locator('#mobility-mode')).toHaveText('Хромота');
});
