import { describe,expect,it,vi } from 'vitest';
import { GameAudio,validateAudio } from '../../src/audio/GameAudio';
function fixture(){
 const params:Record<string,{value:number;setTargetAtTime:ReturnType<typeof vi.fn>;setValueAtTime:ReturnType<typeof vi.fn>;cancelScheduledValues:ReturnType<typeof vi.fn>;exponentialRampToValueAtTime:ReturnType<typeof vi.fn>}>={};
 let id=0;const nodes:any[]=[],parameter=()=>{const p={value:0,setTargetAtTime:vi.fn(),setValueAtTime:vi.fn(),cancelScheduledValues:vi.fn(),exponentialRampToValueAtTime:vi.fn()};params[String(id++)]=p;return p;};
 const node=()=>{const n:any={connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),gain:parameter(),frequency:parameter(),Q:parameter(),playbackRate:parameter()};nodes.push(n);return n;};
 const context:any={state:'suspended',currentTime:1,sampleRate:8000,destination:{},createGain:node,createBiquadFilter:node,createOscillator:node,createBufferSource:node,
  createDynamicsCompressor:()=>({...node(),threshold:parameter(),knee:parameter(),ratio:parameter()}),
  createBuffer:(_channels:number,length:number)=>({getChannelData:()=>new Float32Array(length)}),
  resume:vi.fn(async()=>{context.state='running';}),close:vi.fn(async()=>{context.state='closed';})};
 const factory=vi.fn(()=>context as AudioContext);return {factory,context,nodes,params};
}
describe('procedural game audio',()=>{
 it('validates/clamps settings and survives malformed or blocked local storage',()=>{
  expect(validateAudio(null)).toEqual({enabled:true,volume:.35});expect(validateAudio({volume:4,enabled:false})).toEqual({volume:1,enabled:false});
  expect(validateAudio({volume:NaN,enabled:'bad'})).toEqual({volume:.35,enabled:true});
  const audio=new GameAudio({getItem:()=>'{bad',setItem:()=>{throw Error('blocked');}},()=>{throw Error('unsupported');});
  expect(()=>audio.configure({volume:.2})).not.toThrow();audio.unlock();expect(audio.snapshot.available).toBe(false);expect(audio.snapshot.initialized).toBe(false);
 });
 it('does not initialize outside a user gesture, reuses a single graph, and gates paused/muted SFX',async()=>{
  const f=fixture(),audio=new GameAudio(null,f.factory);audio.setRunning(true);audio.saw(true,true);audio.cut();expect(f.factory).not.toHaveBeenCalled();
  audio.unlock();await Promise.resolve();audio.unlock();expect(f.factory).toHaveBeenCalledTimes(1);expect(audio.snapshot.initialized).toBe(true);
  expect(audio.snapshot.active).toBe(true);expect(audio.snapshot.cutting).toBe(true);
  audio.cut();expect(audio.snapshot.voices).toBe(1);audio.setRunning(false);expect(audio.snapshot.voices).toBe(0);expect(audio.snapshot.active).toBe(false);
  audio.cut();expect(audio.snapshot.voices).toBe(0);audio.setRunning(true);audio.saw(true,false);expect(audio.snapshot.cutting).toBe(false);
  audio.configure({enabled:false});expect(audio.snapshot.active).toBe(false);audio.cut();expect(audio.snapshot.voices).toBe(0);
  audio.configure({enabled:true,volume:0});expect(audio.snapshot.active).toBe(false);
  audio.dispose();expect(f.context.close).toHaveBeenCalledOnce();expect(audio.snapshot.disposed).toBe(true);audio.unlock();expect(f.factory).toHaveBeenCalledTimes(1);
 });
 it('limits low-priority impacts, preserves cut voices and cleans their filters on pause',async()=>{
  const f=fixture(),audio=new GameAudio(null,f.factory);audio.setRunning(true);audio.unlock();await Promise.resolve();
  for(let i=0;i<40;i++)audio.impact(12,32);expect(audio.snapshot.voices).toBe(6);expect(audio.snapshot.impactSounds).toBe(40);
  audio.cut();audio.cut();expect(audio.snapshot.voices).toBe(8);audio.impact(20,72);expect(audio.snapshot.voices).toBe(8);
  audio.resetSession();expect(audio.snapshot.voices).toBe(0);expect(audio.snapshot.impactSounds).toBe(0);
  audio.impact(20,72);expect(audio.snapshot.impactSounds).toBe(0);audio.dispose();
  for(const node of f.nodes)expect(node.disconnect).toHaveBeenCalled();
 });
 it('bounds one-shot voices, cleans every node/source, and persists settings without runtime timers',async()=>{
  const f=fixture(),store=new Map<string,string>(),storage={getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>{store.set(key,value);}};
  const audio=new GameAudio(storage,f.factory);audio.configure({volume:.6});audio.setRunning(true);audio.unlock();await Promise.resolve();
  for(let i=0;i<30;i++)audio.cut();expect(audio.snapshot.voices).toBe(8);
  const restored=new GameAudio(storage,f.factory);expect(restored.settings.volume).toBe(.6);restored.dispose();
  audio.dispose();for(const node of f.nodes)expect(node.disconnect).toHaveBeenCalled();
  for(const node of f.nodes.filter(n=>n.start.mock.calls.length))expect(node.stop).toHaveBeenCalled();
 });
});
