import type { PlayerDamage } from '../player/PlayerDamage';
import type { WeaponKind } from './WeaponController';

export const HEAD_WEAPONS:readonly WeaponKind[]=['rotor','svarlHead'];
export function canCarryWeapon(damage:PlayerDamage,kind:WeaponKind){
 if(!damage.alive)return false;
 return HEAD_WEAPONS.includes(kind)?damage.has('head'):[-1,1].some(side=>damage.has(`upperArm${side}`)&&damage.has(`forearm${side}`));
}
/** Independent seeded shuffle bag: all usable weapons appear before repeats. */
export class WeaponSupplies {
 private bag:WeaponKind[]=[];private first=true;
 constructor(private random:()=>number){}
 next(damage:PlayerDamage):WeaponKind|null{
  const kinds:WeaponKind[]=['saw','axe','sword','launcher','svarl','rotor','svarlHead'];
  const usable=kinds.filter(kind=>canCarryWeapon(damage,kind));
  if(!usable.length)return null;
  if(this.first){this.first=false;const first=usable.includes('saw')?'saw':usable[0];this.refill(usable.filter(k=>k!==first));return first;}
  this.bag=this.bag.filter(kind=>usable.includes(kind));
  // Include newly usable kinds only on the next refill; missing limbs never
  // yield an unusable current supply.
  if(!this.bag.length)this.refill(usable);
  return this.bag.pop()!;
 }
 private refill(kinds:WeaponKind[]){
  this.bag=[...kinds];
  for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}
 }
}
