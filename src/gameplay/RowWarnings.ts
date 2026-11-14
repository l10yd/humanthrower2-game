import type { Row } from '../grid/RowDetector';
/** Warning pulses use simulation time, not AudioContext/RAF time. */
export class RowWarnings {
 private nextPulse=new Map<number,{fireAt:number;at:number}>();
 update(rows:readonly Row[],now:number):boolean {
  let pulse=false;const active=new Set<number>();
  for(const row of rows){
   if(row.state!=='ARMED'||row.fireAt<=now)continue;active.add(row.index);
   let next=this.nextPulse.get(row.index);
   if(!next||next.fireAt!==row.fireAt){next={fireAt:row.fireAt,at:now};this.nextPulse.set(row.index,next);}
   if(now+1e-8>=next.at){pulse=true;next.at=now+(row.fireAt-now<.4?.12:.25);}
  }
  for(const index of this.nextPulse.keys())if(!active.has(index))this.nextPulse.delete(index);
  return pulse;
 }
 reset(){this.nextPulse.clear();}
}
export function rowWarningText(rows:readonly Row[],now:number):string {
 const active=rows.filter(r=>r.state==='ARMED').sort((a,b)=>a.index-b.index);
 return active.length?`⚠ СРЕЗ · ${active.map(r=>`${r.index+1}-й ряд: ${Math.max(0,r.fireAt-now).toFixed(1)} с`).join(' · ')} · уйди из полосы`:'';
}
