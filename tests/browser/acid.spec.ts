import {test,expect} from '@playwright/test';
test('pile acid warns, rises yellow, dissolves low debris, freezes on pause and resets',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const setup=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.restart(17);g.pause();g.scheduler.next=g.chaos.nextEvent=g.chaos.nextWeapon=g.chaos.nextMedkit=1e9;
  g.player.current={x:3,y:6,z:0};g.player.body.setTranslation(g.player.current,true);g.player.body.setNextKinematicTranslation(g.player.current);g.player.flight=true;
  const low=g.physics.createPart(box(.2,.2,.2),{position:{x:0,y:.3,z:0},rotation:{x:0,y:0,z:0,w:1}},5,1,'low');
  const high=g.physics.createPart(box(.2,.2,.2),{position:{x:0,y:5,z:0},rotation:{x:0,y:0,z:0,w:1}},5,2,'high');high.body.setGravityScale(0,true);
  g.chaos.schedule('acid',g.now,0);g.state='RUNNING';g.audio.setRunning(true);(g as unknown as {fixedUpdate():void}).fixedUpdate();
  return {low:low.id,high:high.id};
 });
 await expect(page.locator('#chaos-banner')).toContainText('КИСЛОТА');expect(await page.evaluate(()=>window.humanthrower.acid.level)).toBe(0);
 await page.evaluate(()=>{const g=window.humanthrower;g.pause();g.state='RUNNING';for(let i=0;i<250&&g.state==='RUNNING';i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();g.pause();});
 const result=await page.evaluate(ids=>{
  const g=window.humanthrower,pool=g.renderer.scene.getObjectByName('AcidPool') as unknown as {visible:boolean;scale:{y:number};material:{color:{getHexString():string}}};
  return {acid:g.acid.snapshot,lowGone:!g.physics.parts.has(ids.low),highPresent:g.physics.parts.has(ids.high),pool:{visible:pool.visible,height:pool.scale.y,color:pool.material.color.getHexString()},state:g.state};
 },setup);
 expect(result.lowGone).toBe(true);expect(result.highPresent).toBe(true);expect(result.acid.level).toBeLessThanOrEqual(1.6);expect(result.pool.visible).toBe(true);expect(result.pool.height).toBeGreaterThan(1);expect(result.pool.color).toBe('beb900');
 const frozen=await page.evaluate(()=>window.humanthrower.debugSnapshot());await page.waitForTimeout(150);expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(frozen);
 await page.evaluate(()=>window.humanthrower.pauseMenu.close());
 await page.screenshot({path:'test-results/acid-pool.png'});await info.attach('acid.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 await page.locator('#reset').click();await page.locator('#pause').click();expect(await page.evaluate(()=>window.humanthrower.acid.snapshot)).toEqual({level:0,dissolved:0,removedMass:0,exposed:0});expect(errors).toEqual([]);
});
