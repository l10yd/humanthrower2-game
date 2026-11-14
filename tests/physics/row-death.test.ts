import {beforeAll,expect,it} from 'vitest';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {PlayerController} from '../../src/player/PlayerController';
import {GoreSystem} from '../../src/gameplay/GoreSystem';
import {burstPlayer} from '../../src/gameplay/DeathSequence';
import {clearRows} from '../../src/slicing/ClearTransaction';
beforeAll(async()=>{await RAPIER.init();});
it('fatal row with no retained vital component starts death without respawning an empty rig',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),g=new GoreSystem();
 try{
  c.prepareRowDeath(0);clearRows(p,[1],'solver',true);expect(c.resumeAfterCut(0)).toBe(false);
  expect(c.ragdoll.parts).toHaveLength(0);const survivors=[...p.parts.values()].filter(part=>!['head','chest','pelvis'].includes(part.limb)).map(part=>part.id),knockdowns=c.ragdoll.knockdowns;
  expect(survivors.length).toBeGreaterThan(0);expect(()=>burstPlayer(p,c,g,0)).not.toThrow();
  expect(survivors.every(id=>p.parts.has(id))).toBe(true);expect(c.ragdoll.knockdowns).toBe(knockdowns);expect(c.ragdoll.dead).toBe(true);expect(c.collider.isEnabled()).toBe(false);
  for(let i=0;i<120;i++)p.step();expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
});
