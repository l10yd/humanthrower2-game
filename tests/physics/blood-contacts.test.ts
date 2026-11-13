import { beforeAll,describe,it,expect } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { GoreSystem } from '../../src/gameplay/GoreSystem';
import { validateBlood } from '../../src/gameplay/BloodSettings';
import { box,contains } from '../../src/slicing/ConvexClipper';
import { splitPart } from '../../src/slicing/Dismemberment';
import { axisAngle,identity,vec } from '../../src/slicing/Math';
import { bloodDecalGeometry } from '../../src/rendering/BloodDecals';
beforeAll(async()=>{await RAPIER.init();});
describe('swept blood contacts and mode isolation',()=>{
 it('hits the nearest thin body before the floor and stores the surface in body-local coordinates',()=>{
  const p=new PhysicsManager();try{
   const near=p.createPart(box(.2,.015,.2),{position:vec(0,2,0),rotation:identity},3,1,'near');
   p.createPart(box(.2,.015,.2),{position:vec(0,1,0),rotation:identity},3,2,'far');
   const gore=new GoreSystem();gore.drops.push({position:vec(0,3,0),velocity:vec(0,-300,0),life:1,size:.03});
   gore.update(p,1/60);expect(gore.drops.length).toBe(0);expect(gore.stains.length).toBe(1);
   const stain=gore.stains[0];expect(stain.partId).toBe(near.id);expect(stain.position.y).toBeCloseTo(.015,4);expect(stain.normal.y).toBeCloseTo(1,4);
   expect(near.body.linvel()).toEqual(vec());expect(near.body.mass()).toBeCloseTo(3,4);
  }finally{p.dispose();}
 });
 it('does not stain an outgoing surface when born inside a body or its source wound body',()=>{
  const p=new PhysicsManager();try{
   const part=p.createPart(box(.3,.3,.3),{position:vec(0,2,0),rotation:identity},3,1,'chest');
   const gore=new GoreSystem();gore.drops.push({position:vec(0,2,0),velocity:vec(100,0,0),life:1,size:.03});
   gore.update(p,.01);expect(gore.stains.length).toBe(0);expect(gore.drops.length).toBe(1);
   gore.drops=[{position:vec(-.6,2,0),velocity:vec(100,0,0),life:1,size:.03,sourcePartId:part.id}];gore.update(p,.01);expect(gore.stains.length).toBe(0);
  }finally{p.dispose();}
 });
 it('remaps attached stains through a split, clips the decal to the survivor, and removes orphaned stains',()=>{
  const p=new PhysicsManager();try{
   const old=p.createPart(box(.4,.4,.2),{position:vec(0,3,0),rotation:identity},22,1,'chest');
   const gore=new GoreSystem();gore.stains.push({position:vec(-.2,0,.2),normal:vec(0,0,1),size:.4,angle:.3,age:5,partId:old.id});
   const cut=splitPart(p,old.id,vec(0,3,0),vec(1,0,0))!;gore.cut(cut,p);
   const stain=gore.stains[0],part=p.parts.get(stain.partId!)!;expect(stain.partId).not.toBe(old.id);expect(stain.age).toBe(5);
   const geometry=bloodDecalGeometry(stain,part.poly),position=geometry.getAttribute('position');expect(position.count).toBeGreaterThan(0);
   for(let i=0;i<position.count;i++)expect(contains(part.poly,vec(position.getX(i),position.getY(i),position.getZ(i)),.004)).toBe(true);
   geometry.dispose();gore.drops=[];gore.wounds=[];p.removePart(part.id);gore.update(p,.01);expect(gore.stains.length).toBe(0);
  }finally{p.dispose();}
 });
 it('turns off all VFX, persists mode with storage fallback, and reduced generates fewer particles',()=>{
  expect(validateBlood('bad')).toBe('full');expect(validateBlood('off')).toBe('off');
  const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
  const full=new GoreSystem(),reduced=new GoreSystem(storage);reduced.configure('reduced');
  full.burst(vec(0,2,0),vec(0,1,0));reduced.burst(vec(0,2,0),vec(0,1,0));expect(reduced.emitted).toBeLessThan(full.emitted);
  expect(new GoreSystem(storage).mode).toBe('reduced');reduced.configure('off');reduced.burst(vec(),vec(0,1,0));expect(reduced.drops.length).toBe(0);
  expect(()=>new GoreSystem({getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}}).configure('off')).not.toThrow();
  reduced.reset();expect(reduced.mode).toBe('off');
 });
 it('checks only nearby body shapes, never raycasts every distant part per droplet',()=>{
  const p=new PhysicsManager();try{
   for(let i=0;i<80;i++)p.createPart(box(.1,.1,.1),{position:vec(100+i,2,0),rotation:identity},3,i+1,'distant');
   const gore=new GoreSystem();for(let i=0;i<40;i++)gore.drops.push({position:vec(0,3,0),velocity:vec(0,-2,0),life:1,size:.03});
   gore.update(p,1/60);expect(gore.rayTests).toBe(0);expect(gore.drops.length).toBe(40);
  }finally{p.dispose();}
 });
 it('all blood modes produce identical physical trajectories, masses and slice results',()=>{
  const states=[];
  for(const mode of ['full','reduced','off']){
   const p=new PhysicsManager();try{
    const part=p.createPart(box(.4,.4,.2),{position:vec(0,4,0),rotation:axisAngle(vec(0,0,1),.4)},22,1,'chest');
    const gore=new GoreSystem();gore.configure(mode);const cut=splitPart(p,part.id,{...part.body.translation()},vec(0,1,0))!;gore.cut(cut,p);
    for(let i=0;i<120;i++){p.step();gore.update(p,CONFIG.dt);}
    states.push([...p.parts.values()].map(p=>({pose:{...p.body.translation()},rotation:{...p.body.rotation()},v:{...p.body.linvel()},w:{...p.body.angvel()},mass:p.body.mass(),poly:p.poly})));
   }finally{p.dispose();}
  }
  expect(states[0]).toEqual(states[1]);expect(states[0]).toEqual(states[2]);
 });
});
