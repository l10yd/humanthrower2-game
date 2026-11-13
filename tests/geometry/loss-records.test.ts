import { describe, expect, it } from 'vitest';
import { LossDetector } from '../../src/gameplay/LossDetector';
import { RecordStore, RULES_VERSION, type SessionRecord } from '../../src/gameplay/RecordStore';
const full=Array(9).fill(.8),empty=Array(9).fill(0);
const record=(score=100):SessionRecord=>({rulesVersion:RULES_VERSION,profile:'desktop',arenaPreset:'9x11x2.4',assisted:false,seed:'17',score,rows:2,durationSeconds:60,maxCombo:1.25,drops:10,lossReason:'RESILIENCE'});
describe('loss confirmation and hysteresis',()=>{
 it('empty/fast geometry, idle and resource delays never cause a defeat',()=>{const d=new LossDetector();for(let i=0;i<100;i++)expect(d.update(i,3,empty,[],false)).toBeNull();expect(d.countdown(100)).toBeNull();});
 it('stable top coverage confirms for .3s then gives 3s countdown',()=>{const d=new LossDetector();d.update(0,3,full,[]);expect(d.countdown(.2)).toBeNull();d.update(.31,3,full,[]);expect(d.countdown(.31)).toBeCloseTo(3);expect(d.update(3.3,3,full,[])).toBeNull();expect(d.update(3.32,3,full,[])).toBe('OVERFLOW');});
 it('five columns retain hysteresis, fewer than five for .3 seconds reset it',()=>{const d=new LossDetector();d.update(0,3,full,[]);d.update(.31,3,full,[]);const five=[.8,.8,.8,.8,.8,0,0,0,0];d.update(1,3,five,[]);expect(d.countdown(1)).not.toBeNull();d.update(1.1,3,empty,[]);d.update(1.41,3,empty,[]);expect(d.countdown(1.41)).toBeNull();});
 it('only a real imminent relief can extend the deadline, at most once',()=>{const d=new LossDetector();d.update(0,3,full,[]);d.update(.31,3,full,[]);d.update(2.8,3,full,[{fireAt:3.8,canRelieve:false}]);expect(d.countdown(2.8)).toBeCloseTo(.51);d.update(2.9,3,full,[{fireAt:3.9,canRelieve:true}]);expect(d.countdown(2.9)).toBeCloseTo(1.5);d.update(3.9,3,full,[{fireAt:4.9,canRelieve:true}]);expect(d.update(4.41,3,full,[])).toBe('OVERFLOW');});
 it('squeeze needs 5 continuous seconds and resets on an available escape',()=>{const d=new LossDetector();d.update(0,3,empty,[],true);expect(d.update(4.9,3,empty,[],true)).toBeNull();d.update(5,3,empty,[],false);d.update(6,3,empty,[],true);expect(d.update(10.9,3,empty,[],true)).toBeNull();expect(d.update(11,3,empty,[],true)).toBe('SQUEEZE');expect(new LossDetector().update(0,0,empty,[])).toBe('RESILIENCE');});
});
describe('validated profile-specific records with storage fallback',()=>{
 it('saves only top 10, survives corruption and separates assisted records',()=>{const map=new Map<string,string>(),store=new RecordStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);}});for(let i=0;i<20;i++)store.save(record(i));expect(store.list(record()).map(r=>r.score)).toEqual([19,18,17,16,15,14,13,12,11,10]);expect(store.list({...record(),assisted:true})).toEqual([]);const key=[...map.keys()][0];map.set(key,JSON.stringify([record(2),{...record(),score:'bad'},{...record(),profile:'mobile'}]));expect(store.list(record()).map(r=>r.score)).toEqual([2]);map.set(key,'{bad');expect(()=>store.list(record())).not.toThrow();});
 it('automatic QTE recovery does not mix earlier landing-pressure records',()=>{
  const store=new RecordStore(null),old={...record(9999),rulesVersion:'2.5-shared-landing-pressure'};
  store.save(old);store.save(record(50));expect(RULES_VERSION).toBe('3.6-optional-head-control-faults');expect(store.list(record()).map(r=>r.score)).toEqual([50]);expect(store.list(old).map(r=>r.score)).toEqual([9999]);
 });
 it('finite QTE protection does not mix records from the permanent-immunity bug',()=>{
  const store=new RecordStore(null),old={...record(9999),rulesVersion:'3.2-mass-aware-support-pressure'};
  store.save(old);store.save(record(50));expect(store.list(record()).map(r=>r.score)).toEqual([50]);expect(store.list(old).map(r=>r.score)).toEqual([9999]);
 });
 it('head weapon immunity does not mix results with pre-immunity rules',()=>{
  const store=new RecordStore(null),old={...record(9999),rulesVersion:'3.3-qte-protection-expires'};
  store.save(old);store.save(record(50));expect(store.list(record()).map(r=>r.score)).toEqual([50]);expect(store.list(old).map(r=>r.score)).toEqual([9999]);
 });
 it('human-scale loads and heavy QTE decay do not mix earlier mass rules',()=>{
  const store=new RecordStore(null),old={...record(9999),rulesVersion:'3.4-head-weapon-immunity-consumption'};
  store.save(old);store.save(record(50));expect(store.list(record()).map(r=>r.score)).toEqual([50]);expect(store.list(old).map(r=>r.score)).toEqual([9999]);
 });
 it('optional head-control rules stay separate from mandatory trauma results',()=>{
  const store=new RecordStore(null),old={...record(9999),rulesVersion:'3.5-gameplay-mass-heavy-qte'};
  store.save(old);store.save(record(50));expect(store.list(record()).map(r=>r.score)).toEqual([50]);expect(store.list(old).map(r=>r.score)).toEqual([9999]);
 });
 it('shared landing-pressure rules stay separate from earlier weapons results',()=>{
  const map=new Map<string,string>(),store=new RecordStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);}});
  const old={...record(9999),rulesVersion:'2.4-weapons-grounded-recovery'};store.save(old);store.save(record(50));
  expect(store.list(record()).map(r=>r.score)).toEqual([50]);expect(store.list(old).map(r=>r.score)).toEqual([9999]);
 });
 it('weapon and recovery rules never mix with pre-weapon records',()=>{
  const map=new Map<string,string>(),store=new RecordStore({getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);}});
  const old={...record(9999),rulesVersion:'2.3-impact-anatomy-head-trauma'};store.save(old);store.save(record(50));
  expect(store.list(record()).map(r=>r.score)).toEqual([50]);expect(store.list(old).map(r=>r.score)).toEqual([9999]);
 });
 it('private mode failures do not interrupt gameplay or lose in-memory results',()=>{const store=new RecordStore({getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('quota');}});expect(store.save(record())[0].score).toBe(100);expect(store.list(record())[0].score).toBe(100);expect(store.unavailable).toBe(true);expect(()=>store.save({...record(),score:NaN})).toThrow();});
});
