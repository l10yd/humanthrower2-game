import {test,expect} from '@playwright/test';
test.use({isMobile:true,hasTouch:true,deviceScaleFactor:2});
for(const viewport of [{width:320,height:740},{width:390,height:844},{width:844,height:390}])test(`mobile controls fit ${viewport.width}x${viewport.height}, are >=56px and preserve a usable canvas`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').tap();await page.locator('#pause').tap();
 const sizes=await page.evaluate(()=>{
  const bounds=(s:string)=>{const r=document.querySelector(s)!.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  return {buttons:[...document.querySelectorAll('#touch button')].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,y:r.y};}),stage:bounds('#stage'),canvas:bounds('#scene'),overflow:document.documentElement.scrollWidth>innerWidth,profile:window.humanthrower.recordProfile.profile};
 });
 expect(sizes.profile).toBe('mobile');expect(sizes.overflow).toBe(false);expect(sizes.stage.height).toBeGreaterThan(100);expect(sizes.canvas.width).toBeGreaterThan(100);expect(sizes.canvas.height).toBeGreaterThan(100);
 for(const b of sizes.buttons){expect(b.width).toBeGreaterThanOrEqual(56);expect(b.height).toBeGreaterThanOrEqual(56);expect(b.x+b.width).toBeLessThanOrEqual(viewport.width);expect(b.y+b.height).toBeLessThanOrEqual(viewport.height);}
 await page.evaluate(()=>{const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},g.now);for(let i=0;i<35;i++){g.player.update({axis:0,pressed:false,released:false,stomp:false},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);}});
 await expect(page.locator('#get-up-qte')).toBeVisible();const qte=await page.locator('#get-up-qte').boundingBox(),stage=await page.locator('#stage').boundingBox();expect(qte!.y).toBeGreaterThanOrEqual(stage!.y-1);expect(qte!.y+qte!.height).toBeLessThanOrEqual(stage!.y+stage!.height+1);
});
test('actual concurrent touch pointers move, jump and attack independently; release/rotation/blur clear held sources',async({page,context})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').tap();await page.locator('#pause').tap();
 await page.evaluate(()=>window.humanthrower.pauseMenu.close()); // Isolate pointer source handling while simulation stays paused.
 const points=await page.evaluate(()=>Object.fromEntries(['left','jump','saw'].map(action=>{const r=document.querySelector(`[data-action="${action}"]`)!.getBoundingClientRect();return [action,{x:r.x+r.width/2,y:r.y+r.height/2}];})));
 const cdp=await context.newCDPSession(page);const finger=(id:number,p:{x:number;y:number})=>({id,x:p.x,y:p.y,radiusX:4,radiusY:4,force:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,points.left),finger(2,points.jump),finger(3,points.saw)]});
 const both=await page.evaluate(()=>window.humanthrower.input.consume());expect(both).toMatchObject({axis:-1,pressed:true,saw:true,jumpPresses:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(1,points.left),finger(2,points.jump),finger(3,points.saw)]});expect(await page.evaluate(()=>window.humanthrower.input.consume())).toMatchObject({axis:-1,pressed:false,saw:true,jumpPresses:0});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[finger(2,points.jump)]});expect(await page.evaluate(()=>window.humanthrower.input.consume())).toMatchObject({axis:-1,released:true,saw:true});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await page.evaluate(()=>window.humanthrower.input.consume())).toMatchObject({axis:0,pressed:false,saw:false});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(5,points.left)]});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));expect(await page.evaluate(()=>window.humanthrower.input.consume())).toMatchObject({axis:0,saw:false});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.setViewportSize({width:844,height:390});expect(await page.evaluate(()=>window.humanthrower.input.consume())).toMatchObject({axis:0,saw:false});await cdp.detach();
});
