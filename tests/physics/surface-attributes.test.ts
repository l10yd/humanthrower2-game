import { beforeAll,it,expect,vi } from 'vitest';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { clearRows } from '../../src/slicing/ClearTransaction';
import { splitPart,bitePart } from '../../src/slicing/Dismemberment';
import { box,massProperties,validate,type ConvexPolyhedron } from '../../src/slicing/ConvexClipper';
import { axisAngle,vec } from '../../src/slicing/Math';
const texture=(poly:ConvexPolyhedron)=>({faces:poly.faces.map((f,i)=>({...f,surfaceId:`surface${i}`,uvs:f.vertices.map(v=>({u:v.x+v.z+i,v:v.y-v.z+i*2}))}))});
beforeAll(async()=>{await RAPIER.init();});
for(const action of ['row','saw','bite'] as const)it(`${action}: UV attributes preserve identical collider geometry, mass and velocity fields`,()=>{
 const worlds=[new PhysicsManager(),new PhysicsManager()];try{
  worlds.forEach((p,i)=>{
   const poly=box(.5,1.5,.25),b=p.createPart(i?texture(poly):poly,{position:vec(0,1.5,0),rotation:axisAngle(vec(0,0,1),.2)},30,1,'chest');b.body.setLinvel(vec(.3,-.7,.2),true);b.body.setAngvel(vec(.1,.3,-.2),true);
   if(action==='row')clearRows(p,[1],'solver');else if(action==='saw')splitPart(p,b.id,vec(0,1.5,0),vec(0,1,0));else bitePart(p,b.id,vec(1,0,0),.3);
  });
  const [bare,authored]=worlds.map(p=>[...p.parts.values()]);expect(authored.length).toBe(bare.length);
  authored.forEach((b,i)=>{
   expect(b.poly.faces.map(f=>f.vertices)).toEqual(bare[i].poly.faces.map(f=>f.vertices));expect(massProperties(b.poly)).toEqual(massProperties(bare[i].poly));expect(b.body.mass()).toBe(bare[i].body.mass());expect(b.body.linvel()).toEqual(bare[i].body.linvel());expect(b.body.angvel()).toEqual(bare[i].body.angvel());validate(b.poly);expect(b.poly.faces.every(f=>f.uvs?.length===f.vertices.length)).toBe(true);
  });
  for(let step=0;step<60;step++){worlds.forEach(p=>p.step());for(const [id,b]of worlds[0].parts){const a=worlds[1].parts.get(id)!;expect(a.body.translation()).toEqual(b.body.translation());expect(a.body.rotation()).toEqual(b.body.rotation());expect(a.body.linvel()).toEqual(b.body.linvel());expect(a.body.angvel()).toEqual(b.body.angvel());}}
 }finally{worlds.forEach(p=>p.dispose());}
});
it('failed cut preserves original authored UV arrays, geometry and bodies',()=>{
 const p=new PhysicsManager();try{
  const poly=texture(box(.4,1.5,.25)),before=JSON.stringify(poly),b=p.createPart(poly,{position:vec(0,1.5,0),rotation:{x:0,y:0,z:0,w:1}},30,1,'chest');
  const original=p.createPart.bind(p);let calls=0;vi.spyOn(p,'createPart').mockImplementation((...args)=>{if(++calls===2)throw Error('fixture UV allocation');return original(...args);});
  expect(()=>clearRows(p,[1],'solver')).toThrow('fixture UV allocation');expect(JSON.stringify(poly)).toBe(before);expect(p.parts.get(b.id)).toBe(b);expect(p.parts.size).toBe(1);expect(p.clearSequence).toBe(0);
 }finally{p.dispose();}
});
