export type TutorialLesson='MOVE'|'DROP'|'STOMP'|'WEAPON'|'ROW'|'REMAINS';
export type TutorialHint=TutorialLesson|'QTE'|'AIRBORNE'|'WON';
export interface TutorialStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
export interface TutorialObservation {
 time:number;running:boolean;demo:boolean;x:number;down:boolean;
 jumped:boolean;attack:boolean;warning:boolean;drops:number;armed:boolean;rows:number;
 qteActive:boolean;qteReady:boolean;
}
const KEY='humanthrower.tutorial.v1';
const LESSONS:TutorialLesson[]=['MOVE','DROP','STOMP','WEAPON','ROW','REMAINS'];
export const TUTORIAL_HINTS:Record<TutorialHint,{title:string;text:string}>={
 MOVE:{title:'Двигайся и прыгай',text:'A/D или ◀/▶ — движение. ПРОБЕЛ / W / ↑ — прыжок; на телефоне — кнопка ↑.'},
 DROP:{title:'Следи за сбросом',text:'Метка сверху показывает, куда упадёт следующее тело. Уходи из-под неё.'},
 STOMP:{title:'Складывай тела',text:'Прыгай на тела. S / ↓ в воздухе — придавить. Остатки помогают заполнить ряд.'},
 WEAPON:{title:'Лови оружие сверху',text:'Подойди к зелёной поставке. Держи E / ЛКМ / «Атака», целься в завал. Оружие изнашивается; Q — сменить найденное, F — убрать.'},
 ROW:{title:'Уходи из мигающей полосы',text:'Полоса скоро исчезнет. Уходи выше или ниже: срез головы или корпуса смертелен.'},
 REMAINS:{title:'Остатки остаются',text:'Куски вне среза сохраняются. Из них складывается следующий ряд — продолжай выживать.'},
 QTE:{title:'Встань из завала',text:'Быстро жми и отпускай ПРОБЕЛ / ↑. A/D тоже помогают. Удержание не считается; масса сверху замедляет шкалу.'},
 AIRBORNE:{title:'Сначала приземлись',text:'QTE начинается после контакта с опорой. Нажатия в падении не заполняют шкалу.'},
 WON:{title:'QTE выигран',text:'Больше жать не нужно: тело распрямляется за 1 с, мешающий завал разлетается. Стены остаются твёрдыми; без ног — ползание.'},
};
/** Read-only gameplay observer: no input synthesis, physics access or wall-clock
 * timers. Completed guidance is remembered; unavailable storage is session-local. */
export class Tutorial {
 enabled=true;completed=false;hint:TutorialHint|null=null;
 private seen=new Set<TutorialLesson>();private stage:TutorialLesson='MOVE';private elapsed=0;private lastTime:number|null=null;
 private startX=0;private jumped=false;private moved=false;private lastRows=0;private remainsUntil=-Infinity;private dropSeen=false;
 constructor(private storage:TutorialStorage|null=null){
  try{const value=JSON.parse(storage?.getItem(KEY)??'null');if(value&&typeof value==='object'&&typeof value.enabled==='boolean'&&typeof value.completed==='boolean'){this.enabled=value.enabled;this.completed=value.completed;}}catch{/* corrupt/unavailable storage keeps defaults */}
 }
 private save(){try{this.storage?.setItem(KEY,JSON.stringify({enabled:this.enabled,completed:this.completed}));}catch{/* continue without storage */}}
 reset(){this.hint=null;this.seen.clear();this.stage='MOVE';this.elapsed=0;this.lastTime=null;this.jumped=this.moved=this.dropSeen=false;this.lastRows=0;this.remainsUntil=-Infinity;}
 dismiss(){this.enabled=false;this.hint=null;this.save();}
 replay(){this.enabled=true;this.completed=false;this.reset();this.save();}
 observe(o:TutorialObservation){
  if(!o.running||!o.demo||!this.enabled||this.completed)return;
  const dt=this.lastTime===null?0:Math.max(0,Math.min(.1,o.time-this.lastTime));
  if(this.lastTime===null)this.startX=o.x;this.lastTime=o.time;
  this.moved ||= Math.abs(o.x-this.startX)>=.5;this.jumped ||= o.jumped;this.dropSeen ||= o.warning;
  if(o.rows>this.lastRows){this.seen.add('ROW');this.remainsUntil=o.time+5;}
  this.lastRows=o.rows;
  // Urgent contextual guidance supersedes basics without consuming their dwell time.
  if(o.qteReady&&o.down){this.hint='WON';return;}
  if(o.qteActive){this.hint='QTE';return;}
  if(o.armed){this.hint='ROW';this.seen.add('ROW');return;}
  if(o.down){this.hint='AIRBORNE';return;}
  if(o.time<this.remainsUntil){this.hint='REMAINS';return;}
  if(this.remainsUntil!==-Infinity)this.seen.add('REMAINS');
  this.hint=this.stage;
  const visible=this.stage==='MOVE'||this.stage==='DROP'&&this.dropSeen||this.stage==='STOMP'&&o.drops>0||this.stage==='WEAPON';
  if(visible)this.elapsed+=dt;else this.hint=null;
  const done=this.stage==='MOVE'&&(this.elapsed>=5||this.elapsed>=1.5&&this.moved&&this.jumped)
   ||this.stage==='DROP'&&this.elapsed>=2.5||this.stage==='STOMP'&&this.elapsed>=4
   ||this.stage==='WEAPON'&&(this.elapsed>=5||this.elapsed>=1.5&&o.attack);
  if(done){this.seen.add(this.stage);this.elapsed=0;this.stage=LESSONS.find(l=>!this.seen.has(l))??'REMAINS';this.hint=null;}
  // Once basics are covered, wait quietly for the first real row warning/clear.
  if(this.stage==='ROW'||this.stage==='REMAINS')this.hint=null;
  if(LESSONS.every(l=>this.seen.has(l))){this.completed=true;this.hint=null;this.save();}
 }
 get snapshot(){return {enabled:this.enabled,completed:this.completed,hint:this.hint,seen:LESSONS.filter(l=>this.seen.has(l)),stage:this.stage};}
}
export function browserTutorialStorage():TutorialStorage|null {try{return window.localStorage;}catch{return null;}}
