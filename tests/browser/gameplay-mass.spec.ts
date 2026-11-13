import {test,expect} from '@playwright/test';
test('HUD uses human kilograms; three bodies block QTE and removing one restores escape',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const overloaded=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;const idle={axis:0,pressed:false,released:false,stomp:false};
  const step=(pressed=false)=>{g.physics.snapshot();g.player.update({...idle,pressed},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);};
  for(let i=0;i<15;i++)step();const npcs=[];
  for(let n=0;n<3;n++){const angle=n===2?-1.25:1.4;npcs.push(g.factory.spawn('normal',{x:n===1?-.35:n===2?.4:0,y:5+n*3.5,z:0},{x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)})!);}
  g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},g.now);for(let i=0;i<240;i++)step();for(let i=0;i<150;i++)step(true);
  return {snapshot:g.debugSnapshot(),third:npcs[2].map(p=>p.id)};
 });
 expect(overloaded.snapshot.loadMass).toBeCloseTo(432,2);expect(overloaded.snapshot.gameplayLoadMass).toBeCloseTo(240,2);
 expect(overloaded.snapshot.qte.overloaded).toBe(true);expect(overloaded.snapshot.qte.ready).toBe(false);
 await expect(page.locator('#qte-remaining')).toContainText('240 кг');await expect(page.locator('#qte-remaining')).toContainText('СЛИШКОМ ТЯЖЕЛО');
 const recovered=await page.evaluate(ids=>{
  const g=window.humanthrower,step=(pressed=false)=>{g.player.update({axis:0,pressed,released:false,stomp:false},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);};
  for(const id of ids)g.physics.removePart(id);for(let i=0;i<150&&!g.player.qte.ready;i++)step(true);for(let i=0;i<60&&g.player.ragdoll.down;i++)step();return g.debugSnapshot();
 },overloaded.third);
 expect(recovered.playerParts).toBe(0);expect(recovered.qte.escapes).toBe(1);expect(recovered.numericFaults).toBe(0);await expect(page.locator('#get-up-qte')).toBeHidden();
});
