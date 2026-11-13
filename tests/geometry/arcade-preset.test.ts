import { describe,expect,it } from 'vitest';
import { CONFIG,PLAYER_SCALE } from '../../src/core/Config';
import { DropScheduler } from '../../src/npc/DropScheduler';
import { loadEffort } from '../../src/player/PileLoad';
describe('arcade demo preset',()=>{
 it('doubles physical size/mass, movement and saw size, halves cut/recovery delays',()=>{
  expect(PLAYER_SCALE).toBe(2);expect(CONFIG.player.height).toBe(2.3);expect(CONFIG.player.radius).toBe(.48);
  expect(CONFIG.player.mass).toBe(64);expect(CONFIG.player.speed).toBe(7.6);expect(CONFIG.player.jumpSpeed).toBe(12.4);
  expect(CONFIG.player.getUpDelay).toBe(.4);expect(CONFIG.player.getUpDuration).toBe(.45);
  expect(CONFIG.saw.reach).toBe(2.1);expect(CONFIG.saw.cutSeconds).toBe(.19);expect(CONFIG.saw.cooldown).toBe(.09);
 });
 it('warns before first drop at 1.5s and keeps exact 1.5s cadence without bursts/doubles',()=>{
  const scheduler=new DropScheduler('demo'),drops:number[]=[];
  for(let i=0;i<60*65;i++){
   const event=scheduler.tick(i/60,0,()=>0);
   if(event){drops.push(event.at+event.delay);expect(event.double).toBe(false);}
   expect(scheduler.burst).toBe(false);
  }
  expect(drops.length).toBeGreaterThan(40);expect(drops[0]).toBeCloseTo(1.5,10);
  drops.slice(1).forEach((at,i)=>expect(at-drops[i]).toBeCloseTo(1.5,10));
 });
 it('needs half the presses at equivalent scaled load, and tolerates twice the load',()=>{
  const old=loadEffort(72,5),arcade=loadEffort(144,2.5,CONFIG.player.escapeLoadScale);
  expect(arcade.requiredRate).toBe(old.requiredRate/2);expect(arcade.mobility).toBeCloseTo(old.mobility);
  expect(loadEffort(144,8,CONFIG.player.escapeLoadScale).mobility).toBeGreaterThan(loadEffort(144,8).mobility);
 });
});
