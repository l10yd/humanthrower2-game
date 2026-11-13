import { beforeAll, describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { box } from '../../src/slicing/ConvexClipper';
import { identity, vec } from '../../src/slicing/Math';
const idle={axis:0,stomp:false,pressed:false,released:false};
beforeAll(async()=>{await RAPIER.init();});
describe('KCC awake/sleeping physical support',()=>{
 it('100 buffered jumps on a dynamic support never fall through and wake sleepers locally',()=>{
  const p=new PhysicsManager(),player=new PlayerController(p);let now=0;
  const step=(pressed=false)=>{p.snapshot();player.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;player.afterStep(now);};
  try{
   const platform=p.createPart(box(2,.1,.5),{position:vec(0,.1,0),rotation:identity},120,1,'support');
   player.body.setTranslation(vec(0,1.37,0),true);player.current=vec(0,1.37,0);player.previous=vec(0,1.37,0);
   p.world.propagateModifiedBodyPositionsToColliders();for(let i=0;i<20;i++)step();
   let jumps=0;for(let cycle=0;cycle<100;cycle++){
    if(cycle%2===0)platform.body.sleep();else platform.body.setLinvel(vec(.15,0,0),true);
    const y=player.current.y;step(true);let peak=y,landed=false,woken=!platform.body.isSleeping();
    for(let i=0;i<160;i++){
     step();peak=Math.max(peak,player.current.y);woken||=!platform.body.isSleeping();
     expect(player.current.y).toBeGreaterThan(.56);
     if(i>25&&player.grounded){landed=true;break;}
    }
    expect(peak-y).toBeGreaterThan(.7);expect(landed).toBe(true);jumps++;
    step();woken||=!platform.body.isSleeping();
    expect(player.ragdoll.knockdowns).toBe(0);expect(woken).toBe(true);
   }
   expect(jumps).toBe(100);expect(p.numericFaults).toBe(0);expect(p.parts.size).toBe(1);
  }finally{player.dispose();p.dispose();}
 });
});
