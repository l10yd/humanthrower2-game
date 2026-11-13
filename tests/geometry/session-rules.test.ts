import { describe, expect, it } from 'vitest';
import { ScoreManager } from '../../src/gameplay/ScoreManager';
import { DifficultyManager } from '../../src/gameplay/DifficultyManager';
import { randomSeed } from '../../src/core/Config';
import type { ClearResult } from '../../src/slicing/ClearTransaction';
const event=(id:number,volumes:number[]):ClearResult=>({transactionId:id,rows:volumes.map((_,i)=>i),removedVolumeByRow:Object.fromEntries(volumes.map((v,i)=>[i,v])),removedVolume:volumes.reduce((a,b)=>a+b,0),fragments:0});
describe('scoring events',()=>{
 it('uses volume PER ROW and idempotent transaction IDs',()=>{const s=new ScoreManager(),e=event(1,[.1,.02]);expect(s.clear(e,0,1,false)).toBe(100);expect(s.rows).toBe(1);expect(s.clear(e,0,1,true)).toBe(0);expect(s.health).toBe(3);});
 it('multiclear is one combo, exact six-second boundary and capped multiplier',()=>{const s=new ScoreManager();expect(s.clear(event(1,[.1,.1]),0,1,false)).toBe(400);expect(s.clear(event(2,[.1]),6,2,false)).toBe(140);expect(s.combo).toBe(1.25);expect(s.clear(event(3,[.1]),12.01,1,false)).toBe(100);for(let i=4;i<20;i++)s.clear(event(i,[.1]),12.01+i,1,false);expect(s.combo).toBe(3);expect(s.maxCombo).toBe(3);});
 it('empty clears do not extend combo, immunity is per event and 8 rows restore health',()=>{const s=new ScoreManager();s.clear(event(1,[.1]),0,1,true);s.clear(event(2,[0,0]),1,1,true);expect(s.health).toBe(2);s.clear(event(3,[0]),2,1,true);expect(s.health).toBe(1);s.clear(event(4,Array(7).fill(.1)),7,1,false);expect(s.combo).toBe(1);expect(s.health).toBe(2);expect(s.total(9.9)).toBe(s.points+9);});
 it('three separate hits exhaust resilience, touching multiple rows costs one hit',()=>{const s=new ScoreManager();for(let i=1;i<=3;i++)s.clear(event(i,[0,0]),i*2,1,true);expect(s.health).toBe(0);});
});
describe('difficulty and type constraints',()=>{
 it('uses the GDD level clock, row bonuses and bounded intervals',()=>{const d=new DifficultyManager();expect(d.level(74.99,7)).toBe(1);expect(d.level(75,8)).toBe(3);expect(d.level(9999,999)).toBe(8);expect(d.interval(1)).toBe(4.8);expect(d.interval(8)).toBe(2.3);});
 it('has no prohibited early types, limits bulky streaks and supplies a small/light every 10 drops',()=>{const d=new DifficultyManager(),rng=randomSeed(17);let bulky=0,sinceSmall=0;for(let i=0;i<200;i++){const level=i<40?1:8,type=d.pick(level,rng);if(level===1)expect(['normal','small','short']).toContain(type);bulky=type==='heavy'||type==='wide'?bulky+1:0;expect(bulky).toBeLessThanOrEqual(2);sinceSmall=type==='small'||type==='light'?0:sinceSmall+1;expect(sinceSmall).toBeLessThan(10);d.committed(type);}});
});
