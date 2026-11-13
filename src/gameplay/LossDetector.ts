import { CONFIG } from '../core/Config';
export type LossReason='ROW_CLEAR'|'RESILIENCE'|'OVERFLOW'|'SQUEEZE'|'IMPACT'|'SUFFOCATION';
export interface ArmedRelief { fireAt:number;canRelieve:boolean }
/** All timers use active simulation time. Resource exhaustion is never a defeat reason. */
export class LossDetector {
  private highSince:number|null=null;private lowSince:number|null=null;private deadline:number|null=null;
  private extended=false;private squeezeSince:number|null=null;
  update(now:number,health:number,criticalCoverage:number[],relief:ArmedRelief[],confirmedSqueeze=false):LossReason|null {
    if(health<=0)return 'RESILIENCE';
    const threshold=Math.ceil(2*CONFIG.rows.columns/3),occupied=criticalCoverage.filter(v=>v>=.6).length;
    if(occupied>=threshold){this.lowSince=null;this.highSince??=now;if(this.deadline===null&&now-this.highSince>=.3)this.deadline=now+3;}
    else {
      this.highSince=null;
      if(occupied<threshold-1){this.lowSince??=now;if(now-this.lowSince>=.3){this.deadline=null;this.extended=false;}}
      else this.lowSince=null;
    }
    if(this.deadline!==null&&!this.extended){
      const fire=relief.filter(r=>r.canRelieve&&r.fireAt>=now&&r.fireAt<=now+CONFIG.rows.warning).map(r=>r.fireAt);
      if(fire.length&&Math.max(...fire)+.5>this.deadline){this.deadline=Math.max(...fire)+.5;this.extended=true;}
    }
    if(this.deadline!==null&&now>=this.deadline)return 'OVERFLOW';
    if(confirmedSqueeze){this.squeezeSince??=now;if(now-this.squeezeSince>=5)return 'SQUEEZE';}else this.squeezeSince=null;
    return null;
  }
  countdown(now:number){return this.deadline===null?null:Math.max(0,this.deadline-now);}
}
