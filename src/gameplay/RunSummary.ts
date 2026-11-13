import type { LossReason } from './LossDetector';
import type { SessionRecord } from './RecordStore';

export const LOSS_LABELS:Record<LossReason,string>={ROW_CLEAR:'ПОГИБ В ОЧИЩАЕМОМ РЯДУ',RESILIENCE:'СТОЙКОСТЬ ИСЧЕРПАНА',OVERFLOW:'КАМЕРА ПЕРЕПОЛНЕНА',SQUEEZE:'ЗАЖАТ ПОД КУЧЕЙ',IMPACT:'ПОГИБ ОТ УДАРОВ',SUFFOCATION:'ЗАДОХНУЛСЯ ПОД ТЕЛАМИ'};
export const LOSS_TIPS:Record<LossReason,string>={
 ROW_CLEAR:'Уходи выше или ниже мигающего ряда до среза. Голова и корпус должны быть вне полосы.',
 RESILIENCE:'Не стой в очищаемых рядах. За серии очищенных рядов восстанавливается стойкость технического режима.',
 OVERFLOW:'Очищай верхние завалы до заполнения критической зоны. Пила и гранатомёт помогают освободить проход.',
 SQUEEZE:'Разгружай завал оружием и ищи боковой выход — одного заблокированного подъёма недостаточно для спасения.',
 IMPACT:'Следи за метками сброса и предупреждениями. Отходи от падающих тел; аптечки восстанавливают повреждённые части.',
 SUFFOCATION:'Под завалом быстро жми и отпускай ПРОБЕЛ. Если слишком тяжело — сначала разгрузи завал оружием или найди аптечку.',
};
export interface RunDetails {rowPoints:number;events:number;weapons:number;broken:number;medkits:number;escapes:number;}
export function formatDuration(seconds:number){const whole=Math.max(0,Math.floor(seconds));return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;}
/** Snapshot only: death visuals or later restarts never change the completed run. */
export function runBreakdown(record:SessionRecord,details:RunDetails){
 return [
  {label:'ОЧКИ ЗА РЯДЫ',value:String(details.rowPoints)},
  {label:'ВЫЖИВАНИЕ',value:`+${Math.floor(record.durationSeconds)}`},
  {label:'ВРЕМЯ',value:formatDuration(record.durationSeconds)},
  {label:'РЯДЫ / КОМБО',value:`${record.rows} / ×${record.maxCombo.toFixed(2)}`},
  {label:'СБРОСЫ / СОБЫТИЯ',value:`${record.drops} / ${details.events}`},
  {label:'ОРУЖИЕ / СЛОМАНО',value:`${details.weapons} / ${details.broken}`},
  {label:'АПТЕЧКИ / ВЫХОДЫ',value:`${details.medkits} / ${details.escapes}`},
 ];
}
