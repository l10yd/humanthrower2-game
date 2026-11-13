import { beforeAll, expect, it } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { massProperties, type ConvexPolyhedron } from '../../src/slicing/ConvexClipper';
import { identity,vec } from '../../src/slicing/Math';
const poly:ConvexPolyhedron={faces:[
 {vertices:[vec(-.14,-.33541076487252125,.15),vec(-.1399258009850231,-.33541076487252125,.15),vec(-.13994535316953305,.33541076487252125,.15),vec(-.14,.33541076487252125,.15)]},
 {vertices:[vec(-.14,-.33541076487252125,.14998079511594622),vec(-.14,-.33541076487252125,.15),vec(-.14,.33541076487252125,.15),vec(-.14,.33541076487252125,.1499858557954799)]},
 {vertices:[vec(-.1399258009850231,-.33541076487252125,.15),vec(-.14,-.33541076487252125,.15),vec(-.14,-.33541076487252125,.14998079511594625)]},
 {vertices:[vec(-.14,.33541076487252125,.14998585579547993),vec(-.14,.33541076487252125,.15),vec(-.13994535316953305,.33541076487252125,.15)]},
 {cap:true,vertices:[vec(-.14,-.33541076487252125,.14998079511594622),vec(-.14,.33541076487252125,.1499858557954799),vec(-.13994535316953305,.33541076487252125,.15),vec(-.1399258009850231,-.33541076487252125,.15)]}
]};
beforeAll(async()=>{await RAPIER.init();});
it('preserves the long thin survivor captured in the natural chaos clear',()=>{
 const p=new PhysicsManager();try{
  const part=p.createPart(poly,{position:vec(0,2,0),rotation:identity},0,1,'thin-arm',1,53.23962355212355);
  expect(part.body.mass()).toBeGreaterThan(0);expect(part.body.mass()).toBeCloseTo(massProperties(poly).volume*53.23962355212355,8);
  for(let i=0;i<120;i++)p.step();expect(p.numericFaults).toBe(0);
 }finally{p.dispose();}
});
