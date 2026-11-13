import { describe,it,expect } from 'vitest';
import { PlayerDamage,BODY_PARTS } from '../../src/player/PlayerDamage';
import { HeadTrauma } from '../../src/player/HeadTrauma';
import { PlayerSurvival } from '../../src/gameplay/PlayerSurvival';
import type { Impact } from '../../src/player/PlayerRagdoll';
const idle={axis:1,pressed:true,released:false,stomp:false,effortPresses:1,jumpPresses:1};
const hit=(id:number,limb='head',speed=6)=>({part:{npcId:id,body:{mass:()=>22}},speed,limb}) as Impact;
describe('anatomical durability',()=>{
 it('bruises reduce strength but never tissue, visibility or get-up eligibility',()=>{
  const d=new PlayerDamage();d.hit('head',6,22);expect(d.parts.head).toBeCloseTo(.82);expect(d.tissue.head).toBe(1);expect(d.has('head')).toBe(true);expect(d.injured).toBe(false);expect(d.alive).toBe(true);
  d.retain('head',1);expect(d.parts.head).toBeCloseTo(.82);
 });
 it('uses accepted impacts for anatomical percentages, not a separate six-hit life counter',()=>{
  const d=new PlayerDamage(),s=new PlayerSurvival(d);expect(s.impact(hit(1),0)).toBe(true);expect(s.health).toBe(82);
  expect(s.impact(hit(1),.2)).toBe(false);expect(d.parts.head).toBeCloseTo(.82);
  for(let i=1;i<6;i++)s.impact(hit(i+1),i*1.3);expect(d.parts.head).toBe(0);expect(d.alive).toBe(false);expect(s.breathe(8,false)).toBe('IMPACT');
 });
 it('survives zero strength or absence of all non-vital limbs; only zero vital strength is lethal',()=>{
  const d=new PlayerDamage();for(const limb of BODY_PARTS)if(!['head','chest','pelvis'].includes(limb))d.retain(limb,0);
  expect(d.alive).toBe(true);expect(d.mobility).toBe('CRAWL');d.parts.chest=.01;expect(d.alive).toBe(true);d.parts.chest=0;expect(d.alive).toBe(false);
 });
 it('six arm impacts do not kill healthy head/body',()=>{
  const d=new PlayerDamage(),s=new PlayerSurvival(d);for(let i=0;i<6;i++)s.impact(hit(i+1,'forearm1'),i*1.3);
  expect(d.parts.forearm1).toBe(0);expect(d.tissue.forearm1).toBe(1);expect(s.health).toBe(100);expect(s.breathe(8,false)).toBeNull();
 });
});
describe('head injury control episodes',()=>{
 it('healthy head has no episodes; damaged head inverts keyboard and mouse without fabricating QTE presses',()=>{
  const t=new HeadTrauma();t.update(0,1);expect(t.input(idle)).toEqual(idle);
  let keys=false,mouse=false;for(let i=0;i<600;i++){t.update(i/60,.45);keys||=t.keyboardInverted;mouse||=t.mouseInverted;const input=t.input(idle);expect(input.pressed).toBe(true);expect(input.jumpPresses).toBe(1);}
  expect(keys).toBe(true);expect(mouse).toBe(true);
 });
 it('replays deterministically and severe trauma sometimes trips; unchanged simulation time freezes effects',()=>{
  const a=new HeadTrauma(),b=new HeadTrauma();let trips=0;
  for(let i=0;i<1800;i++){a.update(i/60,.1);b.update(i/60,.1);trips+=Number(a.takeTrip());b.takeTrip();expect(a.snapshot).toEqual(b.snapshot);}
  expect(trips).toBeGreaterThan(0);const frozen=a.snapshot;for(let i=0;i<30;i++)a.update(29.983333333333334,.1);expect(a.snapshot).toEqual(frozen);
 });
});
