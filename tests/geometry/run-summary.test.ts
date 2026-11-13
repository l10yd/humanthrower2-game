import {expect,it} from 'vitest';
import {RecordStore,RULES_VERSION,type SessionRecord} from '../../src/gameplay/RecordStore';
import {formatDuration,runBreakdown,LOSS_TIPS} from '../../src/gameplay/RunSummary';
import {ScoreManager} from '../../src/gameplay/ScoreManager';
const record=(score=100,durationSeconds=10):SessionRecord=>({rulesVersion:RULES_VERSION,profile:'desktop',arenaPreset:'9x16x2.4-chaos-v4-demo-twitch',assisted:false,seed:'17',score,rows:1,durationSeconds,maxCombo:1,drops:5,lossReason:'IMPACT'});
it('failed writes cannot overwrite in-memory newer records with stale stored data',()=>{
 const old=JSON.stringify([record(50)]),store=new RecordStore({getItem:()=>old,setItem:()=>{throw Error('quota');}});
 store.save(record(100));expect(store.list(record()).map(r=>r.score)).toEqual([100,50]);store.save(record(120));expect(store.list(record()).map(r=>r.score)).toEqual([120,100,50]);expect(store.unavailable).toBe(true);
});
it('ties sort by rows then survival duration and snapshots cannot modify storage',()=>{
 const store=new RecordStore(null);store.save(record(100,10));store.save(record(100,20));expect(store.list(record())[0].durationSeconds).toBe(20);
 const copy=store.list(record());copy[0].score=9999;expect(store.list(record())[0].score).toBe(100);
});
it('result breakdown separates row points and survival seconds and has tips for every cause',()=>{
 const score=new ScoreManager();score.points=300;const r=record(score.total(65.9),65.9),details={rowPoints:300,events:3,weapons:4,broken:1,medkits:2,escapes:1};
 const result=runBreakdown(r,details);expect(r.score).toBe(365);expect(result[0].value).toBe('300');expect(result[1].value).toBe('+65');expect(result[2].value).toBe('1:05');expect(formatDuration(0)).toBe('0:00');expect(Object.keys(LOSS_TIPS)).toHaveLength(6);
});
