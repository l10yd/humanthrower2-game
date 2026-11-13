import { CONFIG } from '../core/Config';
import type { ClearResult } from '../slicing/ClearTransaction';
export class ScoreManager {
  points=0;rows=0;health:number=CONFIG.gameplay.health;maxCombo=1;
  combo=1;private lastClear=-Infinity;private immuneUntil=-Infinity;private transactions=new Set<number>();
  clear(event:ClearResult,now:number,level:number,playerHit:boolean):number {
    if(this.transactions.has(event.transactionId))return 0;this.transactions.add(event.transactionId);
    const before=this.rows,k=event.rows.filter(row=>event.removedVolumeByRow[row]>=CONFIG.gameplay.rowVolume).length;
    if(playerHit&&now>=this.immuneUntil){this.health=Math.max(0,this.health-1);this.immuneUntil=now+CONFIG.gameplay.hitImmunity;}
    if(!k)return 0;
    this.combo=now-this.lastClear<=CONFIG.gameplay.comboWindow?Math.min(CONFIG.gameplay.comboLimit,this.combo+CONFIG.gameplay.comboStep):1;
    this.lastClear=now;this.maxCombo=Math.max(this.maxCombo,this.combo);
    const points=Math.round(100*k*k*(1+.12*(level-1))*this.combo);this.points+=points;this.rows+=k;
    this.health=Math.min(CONFIG.gameplay.health,this.health+Math.floor(this.rows/CONFIG.gameplay.healEvery)-Math.floor(before/CONFIG.gameplay.healEvery));return points;
  }
  total(now:number){return this.points+Math.floor(now);}
  multiplier(now:number){return now-this.lastClear<=CONFIG.gameplay.comboWindow?this.combo:1;}
  get processedTransactions(){return this.transactions.size;}
}
