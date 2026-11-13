import type { LossReason } from './LossDetector';
export const RULES_VERSION='3.6-optional-head-control-faults';
export interface SessionRecord {
  rulesVersion:string;profile:'desktop'|'mobile';arenaPreset:string;assisted:boolean;seed:string;
  score:number;rows:number;durationSeconds:number;maxCombo:number;drops:number;lossReason:LossReason;
}
export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}
const valid=(r:unknown):r is SessionRecord=>{
  if(!r||typeof r!=='object')return false;const x=r as Record<string,unknown>;
  return typeof x.rulesVersion==='string'&&x.rulesVersion.length<=80&&(x.profile==='desktop'||x.profile==='mobile')
    &&typeof x.arenaPreset==='string'&&x.arenaPreset.length<=80&&typeof x.assisted==='boolean'
    &&typeof x.seed==='string'&&x.seed.length<=80&&['ROW_CLEAR','RESILIENCE','OVERFLOW','SQUEEZE','IMPACT','SUFFOCATION'].includes(String(x.lossReason))
    &&['score','rows','drops'].every(k=>typeof x[k]==='number'&&Number.isSafeInteger(x[k])&&(x[k] as number)>=0&&(x[k] as number)<=1e9)
    &&typeof x.durationSeconds==='number'&&Number.isFinite(x.durationSeconds)&&x.durationSeconds>=0&&x.durationSeconds<=1e7
    &&typeof x.maxCombo==='number'&&Number.isFinite(x.maxCombo)&&x.maxCombo>=1&&x.maxCombo<=3;
};
export class RecordStore {
  private memory=new Map<string,SessionRecord[]>();unavailable=false;
  constructor(private storage:StorageLike|null){}
  private key(record:Pick<SessionRecord,'rulesVersion'|'profile'|'arenaPreset'|'assisted'>){
    return `humanthrower.records.${encodeURIComponent(record.rulesVersion)}.${record.profile}.${encodeURIComponent(record.arenaPreset)}.${record.assisted?'assisted':'normal'}`;
  }
  list(profile:Pick<SessionRecord,'rulesVersion'|'profile'|'arenaPreset'|'assisted'>):SessionRecord[]{
    const key=this.key(profile);let data:unknown=this.memory.get(key)??[];
    try{const raw=this.storage?.getItem(key);if(raw)data=JSON.parse(raw);}catch{this.unavailable=true;}
    const records=(Array.isArray(data)?data:[]).filter(valid).filter(r=>this.key(r)===key).sort((a,b)=>b.score-a.score||b.rows-a.rows).slice(0,10);
    this.memory.set(key,records);return records.map(r=>({...r}));
  }
  save(record:SessionRecord):SessionRecord[]{
    if(!valid(record))throw Error('Invalid session record');const key=this.key(record),records=[...this.list(record),{...record}].sort((a,b)=>b.score-a.score||b.rows-a.rows).slice(0,10);
    this.memory.set(key,records);
    try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(key,JSON.stringify(records));}catch{this.unavailable=true;}
    return records.map(r=>({...r}));
  }
}
export function browserRecordStore():RecordStore {
  try{return new RecordStore(window.localStorage);}catch{return new RecordStore(null);}
}
