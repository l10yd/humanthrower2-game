import type { WeaponKind } from './WeaponController';

export const WEAPON_DURABILITY:Record<WeaponKind,number>={saw:100,axe:100,sword:100,launcher:8,svarl:100,rotor:100,svarlHead:100};
/** Demo inventory. Only collected weapons exist; launcher durability is ammunition. */
export class WeaponInventory {
  readonly stock:Partial<Record<WeaponKind,number>>={};
  broken=0;
  has(kind:WeaponKind){return (this.stock[kind]??0)>0;}
  collect(kind:WeaponKind){this.stock[kind]=WEAPON_DURABILITY[kind];}
  use(kind:WeaponKind,amount:number){
    if(!this.has(kind)||amount<=0)return false;
    const remaining=Math.max(0,(this.stock[kind]??0)-amount);
    if(remaining<=1e-6){delete this.stock[kind];this.broken++;return true;}
    this.stock[kind]=remaining;return false;
  }
  get kinds(){return (Object.keys(this.stock) as WeaponKind[]).filter(kind=>this.has(kind));}
  percent(kind:WeaponKind){return Math.ceil((this.stock[kind]??0)/WEAPON_DURABILITY[kind]*100);}
}
