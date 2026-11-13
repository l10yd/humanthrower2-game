import {describe,it,expect} from 'vitest';
import { CONFIG } from '../../src/core/Config';
import {EscapeQte} from '../../src/player/EscapeQte';
const idle={axis:0,pressed:false,released:false,stomp:false};
describe('load-dependent recovery effort',()=>{
 it('landing gate excludes airborne input and holding never adds effort',()=>{
  const q=new EscapeQte();for(let i=0;i<30;i++)q.update({...idle,pressed:true},false);expect(q.effort).toBe(0);expect(q.active).toBe(false);
  q.update({...idle,pressed:true},true);const effort=q.effort;for(let i=0;i<30;i++)q.update({...idle,axis:1},true);expect(q.effort).toBeLessThan(effort);expect(q.pulse).toBeLessThan(.01);
 });
 it('same burst advances less under load; readiness starts the reward without counting a handoff',()=>{
  const light=new EscapeQte(),heavy=new EscapeQte();for(let i=0;i<8;i++){light.update({...idle,pressed:true},true,1/60,0);heavy.update({...idle,pressed:true},true,1/60,320);}
  expect(light.effort).toBe(1);expect(light.progress).toBe(1);expect(light.escapes).toBe(0);expect(heavy.effort).toBeLessThan(.4);
  light.complete(3);expect(light.progress).toBe(1);expect(light.phase).toBe('STANDING');expect(light.escapes).toBe(1);
 });
 it('won effort cannot decay or be rolled back by a subsequent hit',()=>{
  const q=new EscapeQte();for(let i=0;i<9;i++)q.update({...idle,pressed:true},true);
  expect(q.ready).toBe(true);q.interrupt(200,20,2);for(let i=0;i<60;i++)q.update(idle,true);
  expect(q.progress).toBe(1);expect(q.effort).toBe(1);expect(q.escapes).toBe(0);
 });
 it('one or two normal bodies remain escapable, but >=200kg defeats even a fast burst',()=>{
  for(const mass of [80,160]){const q=new EscapeQte();for(let i=0;i<180&&!q.ready;i++)q.update({...idle,pressed:i%6===0},true,CONFIG.dt,mass,i*CONFIG.dt);expect(q.ready).toBe(true);expect(q.overloaded).toBe(false);}
  for(const mass of [199.99999,200,240,320]){
   const q=new EscapeQte();q.effort=q.progress=.9;
   for(let i=0;i<120;i++)q.update({...idle,pressed:true,jumpPresses:12,effortPresses:12},true,CONFIG.dt,mass,i*CONFIG.dt);
   expect(q.ready).toBe(false);expect(q.effort).toBe(0);expect(q.overloaded).toBe(true);expect(q.decayRate).toBeGreaterThan(.7);
   expect(q.requiredPressRate).toBeGreaterThan(CONFIG.escapeOverload.maxPressRate);
   for(let i=0;i<180&&!q.ready;i++)q.update({...idle,pressed:i%6===0},true,CONFIG.dt,80,(120+i)*CONFIG.dt);expect(q.ready).toBe(true);
  }
 });
 it('won recovery remains locked if a heavy load arrives after reaching 100%',()=>{
  const q=new EscapeQte();for(let i=0;i<9;i++)q.update({...idle,pressed:true},true);
  for(let i=0;i<60;i++)q.update(idle,true,CONFIG.dt,1000);
  expect(q.ready).toBe(true);expect(q.effort).toBe(1);expect(q.overloaded).toBe(false);
 });
 it('heavy impact visibly rolls effort back and interrupted phase recovers on further taps',()=>{
  const q=new EscapeQte();for(let i=0;i<6;i++)q.update({...idle,pressed:true},true);const effort=q.effort;q.interrupt(60,8,1);
  expect(q.effort).toBeLessThan(effort-.3);expect(q.phase).toBe('INTERRUPTED');expect(q.rollback).toBeGreaterThan(.3);
  q.update({...idle,pressed:true},true,1/60,0,1.1);expect(q.snapshot.rollbackVisible).toBe(true);
  q.update({...idle,pressed:true},true,1/60,0,3);expect(q.phase).not.toBe('INTERRUPTED');q.reset();expect(q.effort).toBe(0);
 });
});
