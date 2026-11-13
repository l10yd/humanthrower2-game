import { randomSeed } from '../core/Config';
export interface AudioSettings {enabled:boolean;volume:number}
interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}
const KEY='humanthrower.audio.v1';
export function validateAudio(value:unknown):AudioSettings {
  const s=value&&typeof value==='object'?value as Partial<AudioSettings>:{};
  return {enabled:typeof s.enabled==='boolean'?s.enabled:true,volume:typeof s.volume==='number'&&Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):.35};
}
export function browserAudioStorage():StorageLike|null {try{return window.localStorage;}catch{return null;}}
/** Procedural placeholder SFX. No downloaded samples, no gameplay RNG/timers.
 * Graph creation/resume happens ONLY from a real user gesture, never an RAF tick. */
interface Voice {source:AudioScheduledSourceNode;gain:GainNode;extra?:AudioNode;kind:'cut'|'impact'}
export class GameAudio {
  settings:AudioSettings;available=true;
  private context:AudioContext|null=null;private master:GainNode|null=null;
  private motorGain:GainNode|null=null;private grindGain:GainNode|null=null;
  private motor:OscillatorNode|null=null;private second:OscillatorNode|null=null;private filter:BiquadFilterNode|null=null;
  private sources:AudioScheduledSourceNode[]=[];private nodes:AudioNode[]=[];
  private voices=new Set<Voice>();private noise:AudioBuffer|null=null;
  impactSounds=0;
  private running=false;private active=false;private cutting=false;private disposed=false;
  constructor(private storage:StorageLike|null=null,private factory:()=>AudioContext=()=>new AudioContext()){
    let saved:unknown;try{saved=JSON.parse(storage?.getItem(KEY)??'null');}catch{saved=null;}
    this.settings=validateAudio(saved);
  }
  configure(value:Partial<AudioSettings>){
    this.settings=validateAudio({...this.settings,...value});
    try{this.storage?.setItem(KEY,JSON.stringify(this.settings));}catch{/* session-local fallback */}
    if(!this.settings.enabled||this.settings.volume===0)this.clearVoices();
    this.sync();
  }
  unlock(){
    if(this.disposed||!this.settings.enabled||this.settings.volume===0)return;
    try{
      if(!this.context)this.create();
      const context=this.context!;
      if(context.state==='suspended')void context.resume().catch(()=>{this.available=false;});
      this.sync();
    }catch{this.available=false;this.destroy();}
  }
  private create(){
    const ctx=this.factory();this.context=ctx;
    const master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();this.master=master;
    master.gain.value=0;compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=6;
    master.connect(compressor);compressor.connect(ctx.destination);this.nodes.push(master,compressor);
    const motorGain=ctx.createGain(),grindGain=ctx.createGain(),filter=ctx.createBiquadFilter();
    this.motorGain=motorGain;this.grindGain=grindGain;this.filter=filter;motorGain.gain.value=grindGain.gain.value=0;
    filter.type='lowpass';filter.frequency.value=900;filter.Q.value=.7;
    motorGain.connect(filter);filter.connect(master);grindGain.connect(master);this.nodes.push(motorGain,grindGain,filter);
    const motor=ctx.createOscillator(),second=ctx.createOscillator(),secondGain=ctx.createGain();this.motor=motor;this.second=second;
    motor.type='sawtooth';motor.frequency.value=85;second.type='square';second.frequency.value=172;secondGain.gain.value=.12;
    motor.connect(motorGain);second.connect(secondGain);secondGain.connect(motorGain);this.nodes.push(motor,second,secondGain);this.sources.push(motor,second);
    const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0),random=randomSeed(90216);let previous=0;
    for(let i=0;i<data.length;i++){previous=.72*previous+.28*(random()*2-1);data[i]=previous;}this.noise=buffer;
    const noise=ctx.createBufferSource(),noiseFilter=ctx.createBiquadFilter();noise.buffer=buffer;noise.loop=true;
    noiseFilter.type='bandpass';noiseFilter.frequency.value=1300;noiseFilter.Q.value=.6;
    noise.connect(noiseFilter);noiseFilter.connect(grindGain);this.nodes.push(noise,noiseFilter);this.sources.push(noise);
    for(const source of this.sources)source.start();
  }
  setRunning(value:boolean){this.running=value;if(!value){this.active=false;this.cutting=false;this.clearVoices();}this.sync();}
  saw(active:boolean,cutting:boolean){
    const a=this.running&&active,c=a&&cutting;
    if(a===this.active&&c===this.cutting)return;this.active=a;this.cutting=c;this.sync();
  }
  private sync(){
    const ctx=this.context;if(!ctx||!this.master||!this.motorGain||!this.grindGain||!this.motor||!this.second||!this.filter)return;
    const time=ctx.currentTime;
    const ramp=(param:AudioParam,value:number)=>{param.cancelScheduledValues(time);param.setTargetAtTime(value,time,.018);};
    const audible=this.running&&this.settings.enabled&&this.settings.volume>0;
    // Hard silence on lifecycle transitions/mute; avoids a stale release tail in menus.
    this.master.gain.cancelScheduledValues(time);const output=audible?this.settings.volume*.22:0;this.master.gain.value=output;this.master.gain.setValueAtTime(output,time);
    ramp(this.motorGain.gain,this.active?.22:0);ramp(this.grindGain.gain,this.cutting?.28:0);
    ramp(this.motor.frequency,this.cutting?67:95);ramp(this.second.frequency,this.cutting?135:192);ramp(this.filter.frequency,this.cutting?650:1100);
  }
  cut(){
    const ctx=this.context;if(!ctx||!this.master||!this.noise||!this.running||!this.settings.enabled||!this.settings.volume||ctx.state!=='running')return;
    if(this.voices.size>=8)this.removeVoice(this.voices.values().next().value!);
    const source=ctx.createBufferSource(),gain=ctx.createGain(),voice:Voice={source,gain,kind:'cut'};source.buffer=this.noise;source.playbackRate.value=.6;
    source.connect(gain);gain.connect(this.master);const time=ctx.currentTime;
    gain.gain.setValueAtTime(.55,time);gain.gain.exponentialRampToValueAtTime(.001,time+.16);
    this.voices.add(voice);source.onended=()=>this.removeVoice(voice);source.start(time);source.stop(time+.18);
  }
  impact(speed:number,mass:number){
    const ctx=this.context;if(!ctx||!this.master||!this.running||!this.settings.enabled||!this.settings.volume||ctx.state!=='running')return;
    // Limit impacts to six voices, leaving room for cutting SFX. Under saturation
    // discard another impact first, never interrupt a cut for a low-priority thud.
    const impacts=[...this.voices].filter(v=>v.kind==='impact');
    if(impacts.length>=6)this.removeVoice(impacts[0]);
    if(this.voices.size>=8){const oldest=[...this.voices].find(v=>v.kind==='impact');if(!oldest)return;this.removeVoice(oldest);}
    const source=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),voice:Voice={source,gain,extra:filter,kind:'impact'};
    const strength=Math.min(1,Math.max(0,speed/14)),heavy=Math.min(1,Math.max(0,mass/40)),time=ctx.currentTime;
    source.type='sine';source.frequency.setValueAtTime(100-35*heavy,time);source.frequency.exponentialRampToValueAtTime(32-8*heavy,time+.22);
    filter.type='lowpass';filter.frequency.value=260;source.connect(filter);filter.connect(gain);gain.connect(this.master);
    gain.gain.setValueAtTime(.25+.55*strength,time);gain.gain.exponentialRampToValueAtTime(.001,time+.28);
    this.voices.add(voice);source.onended=()=>this.removeVoice(voice);source.start(time);source.stop(time+.3);this.impactSounds++;
  }
  resetSession(){this.setRunning(false);this.impactSounds=0;}
  private removeVoice(voice:Voice){
    if(!this.voices.delete(voice))return;voice.source.onended=null;try{voice.source.stop();}catch{/* already ended */}voice.source.disconnect();voice.extra?.disconnect();voice.gain.disconnect();
  }
  private clearVoices(){for(const voice of [...this.voices])this.removeVoice(voice);}
  private destroy(){
    this.clearVoices();for(const source of this.sources){try{source.stop();}catch{/* partially initialized */}}
    for(const node of this.nodes)node.disconnect();this.sources=[];this.nodes=[];
    const context=this.context;this.context=null;this.master=this.motorGain=this.grindGain=null;this.motor=this.second=null;this.filter=null;this.noise=null;
    if(context&&context.state!=='closed')void context.close().catch(()=>{});
  }
  get snapshot(){return {enabled:this.settings.enabled,volume:this.settings.volume,initialized:this.context!==null,available:this.available,
    active:this.running&&this.active&&this.settings.enabled&&this.settings.volume>0,cutting:this.running&&this.cutting&&this.settings.enabled&&this.settings.volume>0,voices:this.voices.size,impactSounds:this.impactSounds,disposed:this.disposed};}
  dispose(){this.running=false;this.active=false;this.cutting=false;this.disposed=true;this.destroy();}
}
