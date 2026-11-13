import { CONFIG,randomSeed } from '../core/Config';
import type { InputFrame } from './Input';
import { add,sub,type Vec3 } from '../slicing/Math';
/** Independent seeded episode schedule on simulation time. Never changes QTE
 * edge counts or system commands; sound/VFX RNG cannot change these episodes. */
export class HeadTrauma {
 enabled=true;
 private random=randomSeed(50419);private nextEpisode=0;private until=0;private mode:0|1|2|3=0;
 keyboardInverted=false;mouseInverted=false;private tripPending=false;trips=0;
 configure(enabled:boolean){this.enabled=enabled;if(!enabled){this.keyboardInverted=false;this.mouseInverted=false;this.tripPending=false;this.until=0;this.nextEpisode=0;}}
 update(now:number,health:number){
  if(!this.enabled)return;
  const severity=1-Math.max(0,Math.min(1,health));
  if(severity<CONFIG.injury.headOnset){this.tripPending=false;this.keyboardInverted=false;this.mouseInverted=false;this.nextEpisode=now+1;this.until=0;return;}
  if(now>=this.until){this.keyboardInverted=false;this.mouseInverted=false;}
  if(now<this.nextEpisode)return;
  this.mode=(1+Math.floor(this.random()*3)) as 1|2|3;
  this.until=now+.25+severity*.65;this.nextEpisode=now+Math.max(1.1,4-severity*2.8);
  this.keyboardInverted=this.mode!==2;this.mouseInverted=this.mode!==1;
  if(severity>=CONFIG.injury.headTripOnset&&this.random()<severity*.4)this.tripPending=true;
 }
 input(input:InputFrame):InputFrame{return this.enabled&&this.keyboardInverted?{...input,axis:-input.axis}:input;}
 aim(point:Vec3|null,center:Vec3):Vec3|null{return point&&this.enabled&&this.mouseInverted?add(center,sub(center,point)):point;}
 takeTrip(){const trip=this.enabled&&this.tripPending;this.tripPending=false;if(trip)this.trips++;return trip;}
 get snapshot(){return {keyboardInverted:this.keyboardInverted,mouseInverted:this.mouseInverted,trips:this.trips};}
}
