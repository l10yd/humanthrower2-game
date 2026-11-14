import {expect,it} from 'vitest';
import { RowWarnings,rowWarningText } from '../../src/gameplay/RowWarnings';
import type {Row} from '../../src/grid/RowDetector';
const armed=(index=0,fireAt=1.15):Row=>({index,state:'ARMED',since:0,fireAt});
it('warning pulse is immediate, speeds up near the cut and never repeats at paused time',()=>{
 const w=new RowWarnings(),r=[armed()];expect(w.update(r,0)).toBe(true);
 for(let i=0;i<20;i++)expect(w.update(r,0)).toBe(false);
 expect(w.update(r,.24)).toBe(false);expect(w.update(r,.25)).toBe(true);expect(w.update(r,.8)).toBe(true);
 expect(w.update(r,.91)).toBe(false);expect(w.update(r,.92)).toBe(true);expect(w.update(r,1.15)).toBe(false);
});
it('multiple armed rows coalesce audio, retire on clear, and reset for a new session',()=>{
 const w=new RowWarnings();expect(w.update([armed(),armed(2)],0)).toBe(true);
 expect(w.update([],0)).toBe(false);expect(w.update([armed()],0)).toBe(true);
 w.reset();expect(w.update([armed()],0)).toBe(true);
});
it('text lists each warned row, countdown and safe-action instruction',()=>{
 expect(rowWarningText([],0)).toBe('');expect(rowWarningText([armed(2),armed(0)],.15)).toBe('⚠ СРЕЗ · 1-й ряд: 1.0 с · 3-й ряд: 1.0 с · уйди из полосы');
 expect(rowWarningText([armed()],2)).toContain('0.0 с');
});
