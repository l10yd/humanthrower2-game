export const CHAOS_EVENTS={quake:'ЗЕМЛЕТРЯСЕНИЕ',bodyRain:'ЛИВЕНЬ ТЕЛ',gravity:'ТЯЖЁЛАЯ ГРАВИТАЦИЯ',bomb:'БОМБА С НЕБА',saw:'ЦИРКУЛЯРНЫЕ ПИЛЫ',scrap:'МЕТАЛЛОЛОМ',wind:'БОКОВОЙ ШКВАЛ'} as const;
export type ChaosKind=keyof typeof CHAOS_EVENTS;
export interface ChaosEvent {kind:ChaosKind;warningAt:number;startsAt:number;endsAt:number;x:number;started:boolean}
/** Seeded, simulation-time director: no catch-up storms and no consecutive repeats. */
export class ChaosDirector {
 nextEvent=9;nextWeapon=1;nextMedkit=18;events=0;supplies=0;medicalSupplies=0;current:ChaosEvent|null=null;private previous:ChaosKind|null=null;
 constructor(private random:()=>number){}
 schedule(kind:ChaosKind,now:number,x:number){this.current={kind,warningAt:now,startsAt:now+2,endsAt:now+2+({quake:5,bodyRain:6,gravity:6,bomb:3,saw:5,scrap:5,wind:6}[kind]),x,started:false};}
 tick(now:number){
  let supply=false,medkit=false,started:ChaosEvent|null=null;
  if(now>=this.nextMedkit){medkit=true;this.medicalSupplies++;this.nextMedkit=now+22;}
  if(now>=this.nextWeapon){supply=true;this.supplies++;this.nextWeapon=now+8+this.random()*5;}
  if(this.current&&now>=this.current.endsAt){this.previous=this.current.kind;this.current=null;this.nextEvent=now+Math.max(5,11-now/60)+this.random()*5;}
  if(!this.current&&now>=this.nextEvent){const kinds=(Object.keys(CHAOS_EVENTS) as ChaosKind[]).filter(k=>k!==this.previous);this.schedule(kinds[Math.floor(this.random()*kinds.length)],now,-3+this.random()*6);}
  if(this.current&&!this.current.started&&now>=this.current.startsAt){this.current.started=true;started=this.current;this.events++;}
  return {supply,medkit,started};
 }
 get active(){return this.current?.started?this.current:null;}
 get snapshot(){return {nextEvent:this.nextEvent,nextWeapon:this.nextWeapon,nextMedkit:this.nextMedkit,medicalSupplies:this.medicalSupplies,events:this.events,supplies:this.supplies,current:this.current?{...this.current}:null};}
}
