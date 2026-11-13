import { CONFIG } from '../core/Config';
import type { RowCoverage } from './OccupancyRaster';
export interface Row { index:number; state:'OPEN'|'CANDIDATE'|'ARMED'|'COOLDOWN'; since:number; fireAt:number }
export class RowDetector {
  rows:Row[]=Array.from({length:CONFIG.rows.count},(_,index)=>({index,state:'OPEN',since:0,fireAt:Infinity}));
  measure(coverage:RowCoverage[],now:number) {
    for(const row of this.rows) {
      if(row.state==='COOLDOWN'&&now>=row.since)row.state='OPEN';
      if(row.state==='OPEN'&&coverage[row.index].qualifies){row.state='CANDIDATE';row.since=now;}
      if(row.state==='CANDIDATE') {
        if(!coverage[row.index].qualifies)row.state='OPEN';
        else if(now-row.since>=CONFIG.rows.confirmation){row.state='ARMED';row.fireAt=now+CONFIG.rows.warning;}
      }
    }
  }
  arm(index:number,now:number){const r=this.rows[index];if(r.state!=='ARMED'){r.state='ARMED';r.fireAt=now+CONFIG.rows.warning;}}
  due(now:number):number[]{return this.rows.filter(r=>r.state==='ARMED'&&r.fireAt<=now+1e-8).map(r=>r.index);}
  committed(rows:number[],now:number){for(const i of rows){this.rows[i].state='COOLDOWN';this.rows[i].since=now+CONFIG.rows.cooldown;}}
}
