import { test,expect } from '@playwright/test';
test('accepted injuries update the map and trigger simulation-time head control faults without removing the head',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 await page.locator('#head-control-faults').check();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;
  const body=g.physics.createPart(box(.2,.2,.2),{position:{x:3,y:5,z:0},rotation:{x:0,y:0,z:0,w:1}},22,100,'fixture');
  for(let i=0;i<4;i++){body.npcId=100+i;g.survival.impact({part:body,point:{...g.player.current},velocity:{x:0,y:-6,z:0},speed:6,limb:'head'},i*1.3);}
  const raw={axis:1,stomp:false,pressed:true,released:false,jumpPresses:1,effortPresses:1};let keys=false,mouse=false;
  for(let i=0;i<600;i++){g.player.controls(raw,5+i/60);keys||=g.player.trauma.keyboardInverted;mouse||=g.player.trauma.mouseInverted;}
  g.now=15;g.player.controls(raw,g.now);return {head:g.player.damage.parts.head,meshHead:g.player.damage.has('head'),keys,mouse,health:g.health,snapshot:g.debugSnapshot()};
 });
 expect(result.head).toBeCloseTo(.28);expect(result.meshHead).toBe(true);expect(result.keys).toBe(true);expect(result.mouse).toBe(true);expect(result.health).toBeGreaterThan(0);
 await expect(page.locator('[data-limb="head"]')).toContainText('28%');await expect(page.locator('[data-limb="head"]')).toHaveAttribute('data-hurt','true');
 const frozen=await page.evaluate(()=>window.humanthrower.debugSnapshot());await page.waitForTimeout(100);expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(frozen);
 await page.screenshot({path:'test-results/head-trauma.png'});
 await page.locator('#reset').click();expect(await page.evaluate(()=>window.humanthrower.player.damage.parts.head)).toBe(1);expect(await page.evaluate(()=>window.humanthrower.player.trauma.snapshot)).toEqual({keyboardInverted:false,mouseInverted:false,trips:0});
});
test('lost arms and legs alone keep the session alive; zero head ends it',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const report=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;g.state='RUNNING';
  for(const limb of Object.keys(g.player.damage.parts) as (keyof typeof g.player.damage.parts)[])if(!['head','chest','pelvis'].includes(limb))g.player.damage.retain(limb,0);
  (g as unknown as {fixedUpdate():void}).fixedUpdate();const survived=g.state==='RUNNING';
  g.player.damage.parts.head=0;for(let i=0;i<130&&(g.state==='RUNNING'||g.state==='DYING');i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  return {survived,result:g.result,damage:g.player.damage.snapshot};
 });
 expect(report.survived).toBe(true);expect(report.result?.lossReason).toBe('IMPACT');expect(report.damage.parts.chest).toBe(1);expect(report.damage.parts.pelvis).toBe(1);
});
