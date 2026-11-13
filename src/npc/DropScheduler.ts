import { CONFIG } from '../core/Config';
export interface DropEvent {at:number;delay:number;double:boolean}
/** Simulation-time schedule; bounded pending warnings and no catch-up train after a pause. */
export class DropScheduler {
  constructor(private mode:'demo'|'technical'='technical') {if(mode==='demo'){this.next=CONFIG.demo.firstDrop-CONFIG.spawn.warning;this.nextBurst=Infinity;}}
  next:number=3;burstUntil=0;nextBurst:number=CONFIG.spawn.firstBurst;
  get burst(){return this.burstUntil>0;}
  tick(now:number,pending:number,random:()=>number):DropEvent|null {
    if(this.burstUntil&&now>=this.burstUntil)this.burstUntil=0;
    if(now>=this.nextBurst){this.burstUntil=now+CONFIG.spawn.burstDuration;this.nextBurst=now+CONFIG.spawn.burstPeriod;}
    if(now+1e-9<this.next)return null;
    const interval=this.mode==='demo'?CONFIG.demo.dropInterval:this.burst?CONFIG.spawn.burstInterval:CONFIG.spawn.interval;
    this.next=now-this.next>CONFIG.dt+1e-9?now+interval:this.next+interval;
    if(pending>=CONFIG.spawn.maxPending)return null;
    return {at:now,delay:CONFIG.spawn.warning,double:this.burst&&pending+2<=CONFIG.spawn.maxPending&&random()<.45};
  }
}
