import { CONFIG } from '../core/Config';
import type { InputFrame } from './Input';
export type RecoveryPhase='AIRBORNE'|'BRACING'|'RISING'|'BLOCKED'|'INTERRUPTED'|'STANDING';
/** Effort reaching 100% locks the one-second recovery reward. Actual control
 * handoff is counted separately by complete(). */
export class EscapeQte {
 active=false;progress=0;effort=0;escapes=0;completedAt=-Infinity;
 phase:RecoveryPhase='AIRBORNE';loadMass=0;pressRate=0;pulse=0;rollback=0;rollbackUntil=-Infinity;
 private presses:number[]=[];private lastNow=0;
 get overloaded(){return this.loadMass+1e-4>=CONFIG.escapeOverload.thresholdKg&&!this.ready;}
 get decayRate(){const resistance=1+this.loadMass/CONFIG.escapeQte.loadKg;return this.overloaded?CONFIG.escapeOverload.decayPerSecond+Math.max(0,this.loadMass-CONFIG.escapeOverload.thresholdKg)*CONFIG.escapeOverload.extraDecayPerKg:CONFIG.escapeQte.decay*Math.min(3,resistance);}
 get requiredPressRate(){return this.decayRate*(1+this.loadMass/CONFIG.escapeQte.loadKg)/CONFIG.escapeQte.jumpGain;}
 get ready(){return this.effort>=1;}
 /** Kept for external diagnostic compatibility; UI uses rate, not a tap count. */
 get remainingJumpPresses(){return Math.max(0,Math.ceil((1-this.effort)/CONFIG.escapeQte.jumpGain));}
 update(input:InputFrame,active:boolean,dt=CONFIG.dt,loadMass=0,now=this.lastNow+dt):boolean {
  this.lastNow=now;this.loadMass=Math.max(0,loadMass);this.active=active;
  this.pulse*=Math.exp(-dt*12);
  if(!active){if(this.phase!=='STANDING')this.phase='AIRBORNE';return false;}
  if(this.phase==='STANDING'){this.effort=this.progress=0;this.presses=[];}
  const jump=Math.max(0,Math.min(12,input.jumpPresses??(input.pressed?1:0)));
  const other=Math.max(0,Math.min(12,input.effortPresses??jump)-jump),taps=jump+other;
  this.presses=this.presses.filter(t=>now-t<1);
  const accepted=this.overloaded?Math.min(taps,Math.max(0,CONFIG.escapeOverload.maxPressRate-this.presses.length)):taps;
  for(let i=0;i<accepted;i++)this.presses.push(now);this.pressRate=this.presses.length;
  const resistance=1+this.loadMass/CONFIG.escapeQte.loadKg;
  const acceptedJump=Math.min(jump,accepted),acceptedOther=Math.min(other,accepted-acceptedJump);
  const rawGain=(acceptedJump*CONFIG.escapeQte.jumpGain+acceptedOther*CONFIG.escapeQte.otherGain)/resistance;
  // A burst of edges cannot bypass heavy-load decay within a single tick.
  const gain=this.overloaded?Math.min(rawGain,CONFIG.escapeOverload.maxPressRate*dt*CONFIG.escapeQte.jumpGain/resistance):rawGain;
  // Holding keys is not effort. Slow presses may overcome decay at light load,
  // whereas a heavy pile requires a sustained burst, not a fixed tap count.
  if(!this.ready)this.effort=Math.max(0,Math.min(1,this.effort+gain-dt*this.decayRate));
  if(taps)this.pulse=1;
  if(now<this.rollbackUntil)this.phase='INTERRUPTED';else this.phase=this.effort<.3?'BRACING':'RISING';
  this.progress=this.effort;return this.ready;
 }
 interrupt(mass:number,speed:number,now:number){
  if(this.ready)return;
  const rollback=Math.min(.6,.18+mass/240+Math.max(0,speed-5)*.012);
  const before=this.effort;this.effort=Math.max(0,this.effort-rollback);this.rollback=before-this.effort;
  this.progress=this.effort;this.phase='INTERRUPTED';this.rollbackUntil=now+1.2;this.active=true;this.pulse=1;
 }
 blocked(){if(this.active&&this.phase!=='INTERRUPTED')this.phase='BLOCKED';}
 complete(now:number){this.active=false;this.effort=this.progress=1;this.phase='STANDING';this.escapes++;this.completedAt=now;}
 reset(){this.active=false;this.progress=this.effort=0;this.phase='AIRBORNE';this.presses=[];this.pressRate=this.pulse=this.rollback=0;this.rollbackUntil=-Infinity;}
 get snapshot(){return {active:this.active,progress:this.progress,effort:this.effort,ready:this.ready,overloaded:this.overloaded,decayRate:this.decayRate,requiredPressRate:this.requiredPressRate,phase:this.phase,loadMass:this.loadMass,pressRate:this.pressRate,pulse:this.pulse,rollback:this.rollback,rollbackVisible:this.lastNow<this.rollbackUntil,remainingJumpPresses:this.remainingJumpPresses,escapes:this.escapes,completedAt:Number.isFinite(this.completedAt)?this.completedAt:null};}
}
