import { CONFIG, type NpcType } from '../core/Config';
const TYPES:NpcType[]=['normal','small','wide','tall','short','heavy','light'];
const START=[.55,.25,0,0,.2,0,0],END=[.3,.1,.15,.15,.1,.1,.1];
export class DifficultyManager {
  private count=0;private bulkyStreak=0;private lastSmall=0;private lastHeavy=-10;private lastWide=-8;
  level(now:number,rows:number){return Math.min(CONFIG.gameplay.maxLevel,1+Math.floor(now/CONFIG.gameplay.levelSeconds)+Math.floor(rows/CONFIG.gameplay.levelRows));}
  interval(level:number){return CONFIG.gameplay.dropIntervals[level-1];}
  pick(level:number,random:()=>number):NpcType {
    const t=Math.min(1,(level-1)/5),weights=START.map((v,i)=>v+(END[i]-v)*t);
    if(level===1){weights[6]=0;weights[2]=0;}
    if(level<3){weights[3]=0;weights[5]=0;}
    if(level===2&&this.count-this.lastWide<8)weights[2]=0;
    if(level===3&&this.count-this.lastHeavy<10)weights[5]=0;
    if(this.bulkyStreak>=2){weights[2]=0;weights[5]=0;}
    if(this.count-this.lastSmall>=9){weights.fill(0);weights[1]=1;weights[6]=level>=2?1:0;}
    let draw=random()*weights.reduce((a,b)=>a+b,0),index=0;
    for(;index<weights.length-1;index++){draw-=weights[index];if(draw<0)break;}
    return TYPES[index];
  }
  committed(type:NpcType){
    this.count++;if(type==='small'||type==='light')this.lastSmall=this.count;
    if(type==='wide')this.lastWide=this.count;if(type==='heavy')this.lastHeavy=this.count;
    this.bulkyStreak=type==='wide'||type==='heavy'?this.bulkyStreak+1:0;
  }
}
