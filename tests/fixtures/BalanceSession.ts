import type {Game,GameState} from '../../src/core/Game';
import {CONFIG} from '../../src/core/Config';
import type {InputFrame} from '../../src/player/Input';
export type BalancePolicy='idle'|'saw';
export const BALANCE_CASES=[17,42,93,20261111,813].flatMap(seed=>['idle','saw'].map(policy=>({seed,policy:policy as BalancePolicy})));
/** Diagnostic bot, not a human playtest: all actions enter through InputFrame.
 * No forced poses, spawned fixtures, row arming, immunity or changed game rules. */
export interface BalanceProbe {setup?:(g:Game)=>void;afterTick?:(g:Game,tick:number)=>boolean}
export function runBalanceSession(g:Game,seed:number,policy:BalancePolicy,maxSeconds=90,probe:BalanceProbe={}){
 if(!['idle','saw'].includes(policy)||!Number.isFinite(maxSeconds)||maxSeconds<1||maxSeconds>300)throw Error('Invalid balance run options');
 g.restart(seed);g.pause();probe.setup?.(g);
 const originalInput=g.input.consume;let tick=0,axis=1;
 const input=():InputFrame=>{
  if(policy==='idle')return {axis:0,pressed:false,released:false,stomp:false,saw:false,effortPresses:0,jumpPresses:0};
  const down=g.player.ragdoll.down,interval=down?8:45,pressed=tick%interval===0;
  if(g.player.current.x>=2.7)axis=-1;else if(g.player.current.x<=-2.7)axis=1;
  if(tick%180===0&&Math.abs(g.player.current.x)<2.2)axis*=-1;
  const base=g.saw.pose().base;
  const target=[...g.physics.parts.values()].filter(p=>p.owner==='npc').sort((a,b)=>{
   const distance=(p:typeof a)=>Math.hypot(p.body.worldCom().x-base.x,p.body.worldCom().y-base.y,p.body.worldCom().z-base.z);
   return distance(a)-distance(b)||a.id-b.id;
  })[0];
  g.saw.aim=target?{...target.body.worldCom()}:null;
  return {axis,pressed,released:tick%interval===Math.min(4,interval-1),stomp:false,saw:true,effortPresses:pressed?1:0,jumpPresses:pressed?1:0};
 };
 let maxParts=0,maxPending=0,downTicks=0,buriedTicks=0,weaponTicks=0,warnings=0,weaponCuts=0,blockedTicks=0;
 let readyAt:number|null=null,seenReady=false,completed=g.player.qte.escapes,lastRows=0,lastDrops=0,lastKnockdowns=0;
 const recoveries:{filledAt:number;handedOffAt:number;seconds:number;mobility:string}[]=[],unresolved:number[]=[],recoveryTrace:unknown[]=[],abortedRecoveries:{filledAt:number;time:number;cause:string}[]=[];
 const samples:{time:number;state:string;drops:number;rows:number;parts:number;health:number;air:number;down:boolean;qte:number}[]=[],rowEvents:{time:number;rows:number}[]=[],dropTimes:number[]=[];
 const state=():GameState=>g.state;
 const seconds=Math.ceil(maxSeconds/CONFIG.dt),start=performance.now();let error:string|null=null;
 g.input.consume=input;g.state='RUNNING';
 try{
  for(tick=0;tick<seconds&&(g.state==='RUNNING'||g.state==='DYING');tick++){
   try{(g as unknown as {fixedUpdate():void}).fixedUpdate();}catch(e){error=String(e);break;}
   maxParts=Math.max(maxParts,g.physics.parts.size);maxPending=Math.max(maxPending,g.warnings.length);
   downTicks+=Number(g.player.ragdoll.down);buriedTicks+=Number(g.buried);weaponTicks+=Number(g.weapons.active);blockedTicks+=Number(g.player.ragdoll.blocked);weaponCuts+=g.weapons.cuts.length;
   if(g.drops>lastDrops){for(let n=lastDrops;n<g.drops;n++)dropTimes.push(g.now);lastDrops=g.drops;}
   if(g.rows>lastRows){rowEvents.push({time:g.now,rows:g.rows-lastRows});lastRows=g.rows;}
   if(readyAt!==null&&!g.player.qte.ready&&g.player.qte.escapes===completed){abortedRecoveries.push({filledAt:readyAt,time:g.now,cause:state()==='GAME_OVER'||state()==='DYING'?'defeat':'effort-reset'});readyAt=null;seenReady=false;}
   if(g.player.ragdoll.knockdowns>lastKnockdowns){lastKnockdowns=g.player.ragdoll.knockdowns;seenReady=false;}
   if(g.player.qte.ready&&g.player.qte.active&&g.player.qte.phase!=='STANDING'&&g.player.ragdoll.down&&!seenReady){readyAt=g.now;seenReady=true;}
   if(readyAt!==null&&(tick%6===0||g.player.qte.escapes>completed)){
    const r=g.player.ragdoll as unknown as {forcedStarted:number;forcedTarget:unknown};
    recoveryTrace.push({time:g.now,effort:g.player.qte.effort,phase:g.player.qte.phase,state:g.player.state,down:g.player.ragdoll.down,blocked:g.player.ragdoll.blocked,pose:g.player.ragdoll.poseProgress,position:{...g.player.current},mobility:g.player.damage.mobility,forcedStarted:Number.isFinite(r.forcedStarted)?r.forcedStarted:null,target:r.forcedTarget?(r.forcedTarget as {center:unknown}).center:null,rows:g.rows});
   }
   if(g.player.qte.escapes>completed){
    if(readyAt!==null)recoveries.push({filledAt:readyAt,handedOffAt:g.now,seconds:g.now-readyAt,mobility:g.player.damage.mobility});
    completed=g.player.qte.escapes;readyAt=null;
   }
   if(tick%60===0||state()==='GAME_OVER')samples.push({time:g.now,state:g.state,drops:g.drops,rows:g.rows,parts:g.physics.parts.size,health:g.health,air:g.survival.air,down:g.player.ragdoll.down,qte:g.player.qte.progress});
   warnings=Math.max(warnings,g.detector.rows.filter(r=>r.state==='ARMED').length);
   if(probe.afterTick?.(g,tick))break;
  }
  if(readyAt!==null)unresolved.push(readyAt);
  const snapshot=g.debugSnapshot(),terminal=state()==='GAME_OVER',runSeconds=g.now;
  return {seed,policy,maxSeconds,status:error?'error':terminal?'defeat':'censored',error,durationSeconds:runSeconds,lossReason:g.result?.lossReason??null,
   drops:g.drops,rows:g.rows,score:g.scoring.total(g.now),health:g.health,knockdowns:g.player.ragdoll.knockdowns,escapes:g.player.qte.escapes,
   weaponCuts,sawCuts:g.saw.cuts,interceptions:g.saw.guard.interceptions,downSeconds:downTicks*CONFIG.dt,buriedSeconds:buriedTicks*CONFIG.dt,blockedSeconds:blockedTicks*CONFIG.dt,weaponSeconds:weaponTicks*CONFIG.dt,
   maxParts,maxPending,maxSimultaneousRowWarnings:warnings,spawnBlocked:g.spawnBlocked,maxSpeed:g.physics.maxSpeed,maxAngularSpeed:g.physics.maxAngularSpeed,numericFaults:g.physics.numericFaults,
   recoveries,unresolved,recoveryTrace,abortedRecoveries,dropTimes,rowEvents,samples,wallMilliseconds:performance.now()-start,final:snapshot};
 }finally{g.input.consume=originalInput;if(g.state==='RUNNING'||g.state==='DYING')g.pause();}
}
