import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { loadEffort } from '../../src/player/PileLoad';
import { PlayerSurvival } from '../../src/gameplay/PlayerSurvival';
import type { Impact } from '../../src/player/PlayerRagdoll';
const hit=(npcId:number,speed=6)=>({part:{npcId},speed}) as Impact;
describe('mass-dependent escape effort',()=>{
 it('requires increasing presses for one/two bodies; three bodies are nearly impossible even at high rate',()=>{
  expect(loadEffort(0,0).mobility).toBe(1);
  expect(loadEffort(72,5).mobility).toBeCloseTo(.7);expect(loadEffort(144,8).mobility).toBeCloseTo(.4);
  expect(loadEffort(144,2).mobility).toBeLessThan(loadEffort(144,8).mobility);
  expect(loadEffort(216,20).mobility).toBeCloseTo(.015,3);expect(loadEffort(216,20).requiredRate).toBe(11);
 });
});
describe('demo injury and oxygen',()=>{
 it('six separate overhead hits kill; repeated contacts/autorepeat or multiple limbs do not multiply damage',()=>{
  const s=new PlayerSurvival();expect(s.impact(hit(1),0)).toBe(true);expect(s.impact(hit(1),.1)).toBe(false);
  expect(s.impact(hit(2),.2)).toBe(false);expect(s.impact(hit(1),1.3)).toBe(false);
  expect(s.impact(hit(2),1.3)).toBe(true);expect(s.impact(hit(3),2.6)).toBe(true);
  expect(s.health).toBe(3);
  for(let i=3;i<CONFIG.survival.hits;i++)expect(s.impact(hit(i+1),i*1.3)).toBe(true);
  expect(s.breathe(6.5,false)).toBe('IMPACT');expect(s.health).toBe(0);
 });
 it('low/side-speed impact is harmless; trapped breathing drains while freedom restores air',()=>{
  const s=new PlayerSurvival();expect(s.impact(hit(1,1),0)).toBe(false);
  s.breathe(0,true);for(let i=1;i<=30;i++)s.breathe(i*.1,true);expect(s.air).toBeCloseTo(2.2);
  for(let i=31;i<=40;i++)s.breathe(i*.1,false);expect(s.air).toBeCloseTo(5);
  let result:null|'IMPACT'|'SUFFOCATION'=null;
  for(let i=41;i<=169;i++)result=s.breathe(i*.1,true);expect(result).toBe('SUFFOCATION');expect(s.health).toBe(6);
 });
});
