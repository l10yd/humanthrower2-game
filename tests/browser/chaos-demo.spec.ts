import { test,expect } from '@playwright/test';
const open=async(page:import('@playwright/test').Page)=>{await page.goto('/?art=off');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();};
test('fatal damage bursts before two seconds of locked control, pause freezes death, result fades in',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 const initial=await page.evaluate(()=>{
  const g=window.humanthrower;g.pause();g.state='RUNNING';g.scheduler.next=1e9;g.chaos.nextEvent=g.chaos.nextWeapon=1e9;g.player.damage.parts.head=0;
  const step=()=>(g as unknown as {fixedUpdate():void}).fixedUpdate();step();const before=g.debugSnapshot();g.pause();for(let n=0;n<150;n++)step();const paused=g.debugSnapshot();g.togglePause();for(let n=0;n<119;n++)step();const late=g.debugSnapshot();g.pause();return {before,paused,late};
 });
 expect(initial.before.state).toBe('DYING');expect(initial.before.result).toBeNull();expect(initial.paused.deathRemaining).toBe(2);expect(initial.late.state).toBe('DYING');
 await expect(page.locator('#overlay')).toBeHidden();
 await page.evaluate(()=>{const g=window.humanthrower;g.togglePause();(g as unknown as {fixedUpdate():void}).fixedUpdate();});
 await expect(page.locator('#overlay')).toBeVisible();await expect(page.locator('#app')).toHaveAttribute('data-state','GAME_OVER');
 expect(await page.locator('#scene').evaluate(e=>getComputedStyle(e).filter)).toContain('blur');
 expect(await page.locator('#overlay').evaluate(e=>getComputedStyle(e).animationName)).toBe('loss-fade');expect(errors).toEqual([]);
});
test('empty starting inventory, sky acquisition, wear and restart reset',async({page})=>{
 await open(page);await expect(page.locator('#weapon')).toBeDisabled();await expect(page.locator('#weapon-durability')).toHaveText('Лови оружие сверху');
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.pause();g.state='RUNNING';g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextWeapon=g.chaos.nextEvent=1e9;
  const item=g.sky.spawn('weapon',g.player.current.x,'axe');item.position={...g.player.current};(g as unknown as {fixedUpdate():void}).fixedUpdate();
  const collected=g.weapons.snapshot;g.weapons.inventory.stock.axe=.001;g.weapons.update({axis:0,pressed:false,released:false,stomp:false,saw:true},1/60);const broken=g.weapons.snapshot;
  g.restart();g.pause();return {collected,broken,reset:g.weapons.snapshot};
 });
 expect(result.collected.inventory.axe).toBe(100);expect(result.broken.broken).toBe(1);expect(result.broken.enabled).toBe(false);expect(result.reset.inventory).toEqual({});
});
test('all random events run and warn without a browser fault; extended cup stays bounded',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.pause();g.state='RUNNING';g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextWeapon=1e9;
  const kinds=['quake','bodyRain','gravity','bomb','saw','scrap','wind'] as const;const seen:string[]=[];
  const step=()=>(g as unknown as {fixedUpdate():void}).fixedUpdate();
  for(const kind of kinds){g.player.damage.parts.head=g.player.damage.parts.chest=g.player.damage.parts.pelvis=1;g.chaos.schedule(kind,g.now,3);for(let n=0;n<125&&g.state==='RUNNING';n++)step();seen.push(g.chaos.current!.kind);g.chaos.current=null;g.chaos.nextEvent=1e9;}
  const snapshot=g.debugSnapshot();g.pause();return {seen,snapshot};
 });
 expect(result.seen).toHaveLength(7);expect(result.snapshot.chaos.events).toBe(7);expect(result.snapshot.numericFaults).toBe(0);expect(result.snapshot.arena.height).toBe(16);expect(result.snapshot.drops).toBeGreaterThan(0);expect(errors).toEqual([]);
});
