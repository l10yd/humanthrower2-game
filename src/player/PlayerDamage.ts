import { CONFIG } from '../core/Config';
export const BODY_PARTS=['head','chest','pelvis','upperArm-1','forearm-1','upperArm1','forearm1','thigh-1','shin-1','thigh1','shin1'] as const;
export type BodyPart=typeof BODY_PARTS[number];
export type MobilityMode='WALK'|'LIMP'|'HOP'|'CRAWL';
/** Durability and retained tissue are independent: bruises never erase a mesh. */
export class PlayerDamage {
 headImmune=false;
 parts:Record<BodyPart,number>=Object.fromEntries(BODY_PARTS.map(l=>[l,1])) as Record<BodyPart,number>;
 tissue:Record<BodyPart,number>=Object.fromEntries(BODY_PARTS.map(l=>[l,1])) as Record<BodyPart,number>;
 get alive(){return this.parts.head>1e-6&&this.parts.chest>1e-6&&this.parts.pelvis>1e-6;}
 get vitalStrength(){return Math.min(this.parts.head,this.parts.chest,this.parts.pelvis);}
 has(limb:string){return (this.tissue[limb as BodyPart]??0)>.08;}
 get injured(){return Object.values(this.tissue).some(v=>v<.98);}
 hit(limb:BodyPart,speed:number,mass:number){
  if(limb==='head'&&this.headImmune)return 0;
  const amount=CONFIG.injury.baseDamage*Math.max(.65,Math.min(2,speed/6))*Math.max(.65,Math.min(1.5,Math.sqrt(Math.max(0,mass)/22)));
  this.parts[limb]=Math.max(0,this.parts[limb]-amount);
  if(this.parts[limb]<1e-6)this.parts[limb]=0;
  return amount;
 }
 retain(limb:BodyPart,amount:number){
  if(limb==='head'&&this.headImmune)return;
  const retained=Math.max(0,Math.min(this.tissue[limb],amount));
  const ratio=this.tissue[limb]>0?retained/this.tissue[limb]:0;
  this.parts[limb]*=ratio;this.tissue[limb]=retained;
  if(retained<.001){this.parts[limb]=0;this.tissue[limb]=0;}
 }
 get legCount(){return [-1,1].filter(s=>this.tissue[`thigh${s}` as BodyPart]>.25).length;}
 get completeLegs(){return [-1,1].filter(s=>this.has(`thigh${s}`)&&this.tissue[`shin${s}` as BodyPart]>.75).length;}
 get mobility():MobilityMode{return this.legCount===0?'CRAWL':this.legCount===1?'HOP':this.completeLegs<2?'LIMP':'WALK';}
 get speedFactor(){
  const legs=[-1,1].filter(s=>this.has(`thigh${s}`));
  const strength=legs.length?legs.reduce((sum,s)=>sum+Math.min(this.parts[`thigh${s}` as BodyPart],this.has(`shin${s}`)?this.parts[`shin${s}` as BodyPart]:1),0)/legs.length:.7;
  return {WALK:1,LIMP:.6,HOP:.4,CRAWL:.22}[this.mobility]*(.35+.65*strength);
 }
 get jumpFactor(){return {WALK:1,LIMP:.6,HOP:.45,CRAWL:0}[this.mobility];}
 get snapshot(){return {parts:{...this.parts},tissue:{...this.tissue},headImmune:this.headImmune,alive:this.alive,mobility:this.mobility,legs:this.legCount};}
}
