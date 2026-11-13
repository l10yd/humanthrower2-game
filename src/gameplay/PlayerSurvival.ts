import { CONFIG } from '../core/Config';
import { PlayerDamage,type BodyPart } from '../player/PlayerDamage';
import type { Impact } from '../player/PlayerRagdoll';
/** Demo injury/air rules, simulation-time only. Unrelated to row-clear resilience. */
export class PlayerSurvival {
 hits=0;lastLimb:BodyPart|null=null;lastDamage=0;
 constructor(public damage:PlayerDamage|null=null){}
 air:number=CONFIG.survival.airSeconds;private nextHit=0;private recent=new Map<number,number>();private lastTime:number|null=null;private loadedSince:number|null=null;
 get health(){return this.damage?Math.ceil(this.damage.vitalStrength*100):Math.max(0,CONFIG.survival.hits-this.hits);}
 impact(impact:Impact|null,now:number):boolean {
  if(!impact||impact.speed<CONFIG.player.impactSpeed||now<this.nextHit||now<(this.recent.get(impact.part.npcId)??0))return false;
  if(this.damage){
   this.lastLimb=impact.limb??'head';this.lastDamage=this.damage.hit(this.lastLimb,impact.speed,impact.part.body.mass());
   if(this.lastDamage===0)return false;
  }
  this.hits++;this.nextHit=now+CONFIG.survival.hitCooldown;this.recent.set(impact.part.npcId,now+CONFIG.survival.sameNpcCooldown);
  for(const [id,until]of this.recent)if(until<now)this.recent.delete(id);
  return true;
 }
 medkit(){
  if(!this.damage?.alive||this.air<=0)return false;
  this.damage.heal(.25);this.air=Math.min(CONFIG.survival.airSeconds,this.air+2);return true;
 }
 breathe(now:number,buried:boolean):'IMPACT'|'SUFFOCATION'|null {
  const dt=this.lastTime===null?0:Math.max(0,Math.min(.25,now-this.lastTime));this.lastTime=now;
  if(buried)this.loadedSince??=now;else this.loadedSince=null;
  const confirmed=buried&&now-(this.loadedSince??now)>=.25;
  this.air=confirmed?Math.max(0,this.air-dt):buried?this.air:Math.min(CONFIG.survival.airSeconds,this.air+dt*CONFIG.survival.airRecovery);
  return this.health===0?'IMPACT':this.air<=0?'SUFFOCATION':null;
 }
}
