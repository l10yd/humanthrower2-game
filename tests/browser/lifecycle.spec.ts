import { test, expect } from '@playwright/test';
test('independent pointer sources, cancellation, blur and disposal never stick movement',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const result=await page.evaluate(()=>{
  const game=window.humanthrower,input=game.input;
  const left=document.querySelector<HTMLButtonElement>('[data-action=left]')!,jump=document.querySelector<HTMLButtonElement>('[data-action=jump]')!;
  // Capture is unavailable to synthetic pointers; keep input listeners, replace capture only.
  left.setPointerCapture=jump.setPointerCapture=()=>{};
  const send=(el:HTMLElement,type:string,id:number)=>el.dispatchEvent(new PointerEvent(type,{pointerId:id,bubbles:true,cancelable:true}));
  send(left,'pointerdown',3);send(jump,'pointerdown',7);const both=input.consume();
  send(left,'pointerdown',3);const duplicate=input.consume();
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',repeat:true}));const repeat=input.consume();
  send(jump,'pointercancel',7);const release=input.consume();send(left,'lostpointercapture',3);const empty=input.consume();
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));window.dispatchEvent(new Event('blur'));const blurred=input.consume();
  input.dispose();window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));send(left,'pointerdown',9);const disposed=input.consume();
  return {both,duplicate,repeat,release,empty,blurred,disposed};
 });
 expect(result.both).toMatchObject({axis:-1,pressed:true,effortPresses:2});expect(result.duplicate.effortPresses).toBe(0);expect(result.repeat.effortPresses).toBe(0);expect(result.release).toMatchObject({axis:-1,released:true});
 expect(result.empty.axis).toBe(0);expect(result.blurred.axis).toBe(0);expect(result.disposed.axis).toBe(0);
});
test('context loss freezes game time and restoration requires explicit resume',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.waitForTimeout(200);
 const restoreKey='__restoreWebGLFixture';
 await page.evaluate(key=>{
  const ext=window.humanthrower.renderer.renderer.getContext().getExtension('WEBGL_lose_context');if(!ext)throw Error('fixture requires WEBGL_lose_context');
  (window as unknown as Record<string,unknown>)[key]=()=>ext.restoreContext();ext.loseContext();
 },restoreKey);
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.state)).toBe('PAUSED');
 const frozen=await page.evaluate(()=>window.humanthrower.now);await page.waitForTimeout(300);
 expect(await page.evaluate(()=>window.humanthrower.now)).toBe(frozen);
 await page.evaluate(key=>{const w=window as unknown as Record<string,()=>void>;w[key]();delete w[key];},restoreKey);
 await expect(page.locator('#hint')).toContainText('Графика восстановлена');
 expect(await page.evaluate(()=>window.humanthrower.state)).toBe('PAUSED');await page.locator('#pause').click();
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.now)).toBeGreaterThan(frozen);
});
test('restart resets clear immunity and all pending warnings',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 await page.evaluate(()=>{const g=window.humanthrower;g.scoring.clear({transactionId:99,rows:[0],removedVolume:0,removedVolumeByRow:{0:0},fragments:0},0,1,true);g.dropOnPlayer();});
 await page.locator('#reset').click();
 const result=await page.evaluate(()=>({transactions:window.humanthrower.scoring.processedTransactions,warning:window.humanthrower.warning,health:window.humanthrower.health,sequence:window.humanthrower.physics.clearSequence}));
 expect(result).toEqual({transactions:0,warning:null,health:100,sequence:0});
});
