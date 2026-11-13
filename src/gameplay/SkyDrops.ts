import { hazardDamage,hazardLimb } from './HazardDamage';
import { CONFIG } from '../core/Config';
import { PhysicsManager,RAPIER } from '../physics/PhysicsManager';
import { CollisionQuery } from '../player/QueryBounds';
import type { PlayerController } from '../player/PlayerController';
import { add,identity,length,mul,sub,vec,type Vec3 } from '../slicing/Math';
import { splitPart,type CutResult } from '../slicing/Dismemberment';
import type { WeaponKind } from './WeaponController';
export type SkyKind='weapon'|'medkit'|'bomb'|'saw'|'scrap';
export interface SkyItem {id:number;kind:SkyKind;weapon?:WeaponKind;position:Vec3;velocity:Vec3;life:number;landed:boolean;spin:number;cooldown:number;entered:boolean;entryRemaining:number}
/** Bounded swept sky objects: never tunnel through piles and never retain removed handles. */
export class SkyDrops {
 items:SkyItem[]=[];private nextId=1;collected=0;medkits=0;destroyed=0;
 spawn(kind:SkyKind,x:number,weapon?:WeaponKind){
  if(this.items.length>=16){this.items.shift();this.destroyed++;}
  const item:SkyItem={id:this.nextId++,kind,weapon,position:vec(x,CONFIG.arena.height+CONFIG.entry.clearance+1,0),velocity:vec(0,-CONFIG.entry.fallSpeed,0),life:kind==='weapon'||kind==='medkit'?28:12,landed:false,spin:0,cooldown:0,entered:false,entryRemaining:CONFIG.entry.timeout};this.items.push(item);return item;
 }
 private outside(item:SkyItem){
  const p=item.position;
  if(p.y<=CONFIG.arena.height)item.entered=true;
  const upper=!item.entered&&item.entryRemaining>0?CONFIG.arena.height+CONFIG.entry.height:CONFIG.arena.height;
  return !Number.isFinite(p.x+p.y+p.z)||Math.abs(p.x)>CONFIG.arena.width/2||p.y<0||p.y>upper||Math.abs(p.z)>CONFIG.arena.depth/2;
 }
 update(physics:PhysicsManager,player:PlayerController,dt:number,interact=true,now=player.simulationTime){
  const collected:WeaponKind[]=[],bombs:Vec3[]=[],cuts:CutResult[]=[];let medkits=0;
  this.items=this.items.filter(item=>{
   item.life-=dt;item.cooldown-=dt;item.spin+=dt*(item.kind==='saw'?30:2);
   if(!item.entered)item.entryRemaining=Math.max(0,item.entryRemaining-dt);
   if(item.life<=0||this.outside(item)){this.destroyed++;return false;}
   if(!item.landed){
    item.velocity.y-=Math.abs(physics.world.gravity.y)*dt;
    const delta=mul(item.velocity,dt),radius=item.kind==='saw'?.48:item.kind==='scrap'?.4:.3;
    const query=new CollisionQuery(physics,c=>c.isEnabled()&&!c.isSensor()&&!physics.isPlayerCeiling(c)&&(!(item.kind==='weapon'||item.kind==='medkit')||c.handle!==player.collider.handle&&physics.partForCollider(c)?.owner!=='player'));
    const end=add(item.position,delta),bounds={min:vec(Math.min(end.x,item.position.x)-radius,Math.min(end.y,item.position.y)-radius,-.7),max:vec(Math.max(end.x,item.position.x)+radius,Math.max(end.y,item.position.y)+radius,.7)};
    let fraction=1,hit:RAPIER.Collider|null=null;
    for(const collider of query.nearby(bounds)){
     const sweep=collider.castShape(vec(),new RAPIER.Ball(radius),item.position,identity,delta,0,1,true);
     if(sweep&&sweep.time_of_impact<=fraction){fraction=sweep.time_of_impact;hit=collider;}
    }
    item.position=add(item.position,mul(delta,fraction));
    if(hit){
     if(item.kind==='weapon'||item.kind==='medkit'){item.position.y+=.06;item.velocity=vec();item.landed=true;}
     else if(item.kind==='bomb'){bombs.push({...item.position});return false;}
     else{
      const part=physics.partForCollider(hit);
      const playerHit=hit.handle===player.collider.handle||part?.owner==='player';
      if(interact&&playerHit&&item.cooldown<=0){hazardDamage(player,hazardLimb(physics,player,item.position,hit),item.kind==='saw'?12:8,30,now);item.cooldown=.6;}
      if(part?.owner==='npc'&&item.kind==='saw'&&item.cooldown<=0){const cut=splitPart(physics,part.id,{...part.body.worldCom()},vec(0,1,0));if(cut)cuts.push(cut);item.cooldown=.15;}
      item.velocity=vec((item.id%2?1:-1)*(item.kind==='saw'?3:1),item.kind==='saw'?2.8:1.2,0);
      item.position.y+=.04;
     }
    }
   }else{
    // A cleared support lets a pickup fall again instead of floating in the air.
    const support=physics.world.castRay(new RAPIER.Ray(item.position,vec(0,-1,0)),.55,true,undefined,undefined,undefined,undefined,c=>c.handle!==player.collider.handle&&physics.partForCollider(c)?.owner!=='player');
    if(!support)item.landed=false;
   }
   if(interact&&item.position.y<=CONFIG.arena.height&&player.damage.alive&&!player.ragdoll.dead&&(item.kind==='weapon'||item.kind==='medkit')){
    const near=length(sub(item.position,player.current))<1.7||player.ragdoll.parts.some(p=>physics.parts.has(p.id)&&length(sub(item.position,p.body.worldCom()))<1.1);
    if(near){
     if(item.kind==='medkit'){medkits++;this.medkits++;return false;}
     if(item.weapon){collected.push(item.weapon);this.collected++;return false;}
    }
   }
   if(this.outside(item)){this.destroyed++;return false;}
   return true;
  });
  return {collected,medkits,bombs,cuts};
 }
 get snapshot(){return {collected:this.collected,medkits:this.medkits,destroyed:this.destroyed,items:this.items.map(i=>({...i,position:{...i.position},velocity:{...i.velocity}}))};}
}
