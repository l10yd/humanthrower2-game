import {it,expect} from 'vitest';
import {Tutorial,type TutorialObservation} from '../../src/gameplay/Tutorial';
const base:TutorialObservation={time:0,running:true,demo:true,x:0,down:false,jumped:false,attack:false,warning:false,drops:0,armed:false,rows:0,qteActive:false,qteReady:false};
const run=(t:Tutorial,frames:number,offset=0,extra:Partial<TutorialObservation>={})=>{for(let i=0;i<frames;i++)t.observe({...base,time:offset+i/60,...extra});};
it('starts basic movement guidance without modifying input observations',()=>{
 const t=new Tutorial(),observation={...base};t.observe(observation);expect(t.hint).toBe('MOVE');expect(observation).toEqual(base);
});
it('movement lesson uses actual travel and jump, not a held jump command alone',()=>{
 const t=new Tutorial();run(t,110);expect(t.snapshot.seen).not.toContain('MOVE');run(t,2,110/60,{x:.7,jumped:true});expect(t.snapshot.seen).toContain('MOVE');expect(t.snapshot.stage).toBe('DROP');
});
it('basics advance with readable dwell; absent drop warning does not consume its lesson',()=>{
 const t=new Tutorial();run(t,310);expect(t.snapshot.stage).toBe('DROP');run(t,120,310/60);expect(t.hint).toBeNull();expect(t.snapshot.seen).not.toContain('DROP');
 run(t,160,430/60,{warning:true,drops:1});expect(t.snapshot.seen).toContain('DROP');run(t,250,590/60,{drops:1});expect(t.snapshot.stage).toBe('WEAPON');
 run(t,110,840/60,{drops:1,attack:true});expect(t.snapshot.stage).toBe('ROW');expect(t.hint).toBeNull();
});
it('QTE wins and urgent row warnings preempt basics without consuming dwell time',()=>{
 const t=new Tutorial();run(t,30);run(t,300,.5,{qteActive:true,down:true});expect(t.hint).toBe('QTE');expect(t.snapshot.seen).not.toContain('MOVE');
 t.observe({...base,time:5.5,qteReady:true,qteActive:true,down:true,armed:true});expect(t.hint).toBe('WON');
 t.observe({...base,time:5.6,armed:true});expect(t.hint).toBe('ROW');expect(t.snapshot.seen).toContain('ROW');
 t.observe({...base,time:5.7,down:true});expect(t.hint).toBe('AIRBORNE');
});
it('row clear explains retained pieces, then waits quietly when basics are not done',()=>{
 const t=new Tutorial();t.observe(base);t.observe({...base,time:.1,rows:1});expect(t.hint).toBe('REMAINS');run(t,120,.2,{rows:1});expect(t.hint).toBe('REMAINS');
 t.observe({...base,time:5.2,rows:1});expect(t.snapshot.seen).toContain('REMAINS');expect(t.snapshot.seen).toContain('ROW');expect(t.completed).toBe(false);
});
it('pause, technical mode and inactive scenes do not change lesson state',()=>{
 const t=new Tutorial();run(t,10);const before=t.snapshot;
 for(const change of [{running:false},{demo:false}])run(t,400,1,change);expect(t.snapshot).toEqual(before);
});
it('completed lessons persist; replay restores them and dismiss remains disabled after reset/reload',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}},t=new Tutorial(storage);
 run(t,310);run(t,160,310/60,{warning:true,drops:1});run(t,250,470/60,{drops:1});run(t,310,720/60,{drops:1});
 t.observe({...base,time:18,armed:true,drops:1});t.observe({...base,time:18.1,rows:1,drops:1});run(t,320,18.2,{rows:1,drops:1});
 expect(t.completed).toBe(true);expect(new Tutorial(storage).completed).toBe(true);t.replay();expect(t.completed).toBe(false);expect(t.snapshot.seen).toEqual([]);
 t.observe(base);expect(t.hint).toBe('MOVE');t.dismiss();t.reset();expect(t.enabled).toBe(false);expect(new Tutorial(storage).enabled).toBe(false);
});
it('bad or denied storage never blocks gameplay and reset clears simulation-time progress',()=>{
 for(const storage of [{getItem:()=>'{broken',setItem:()=>{}},{getItem:()=>'{"enabled":"no","completed":true}',setItem:()=>{}},{getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');}}]){
  const t=new Tutorial(storage);t.observe({...base,time:40});expect(t.hint).toBe('MOVE');t.dismiss();t.replay();t.reset();t.observe(base);expect(t.hint).toBe('MOVE');expect(t.completed).toBe(false);
 }
});
