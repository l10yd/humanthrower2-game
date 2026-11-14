import {test,expect} from '@playwright/test';
for(const kind of ['svarlHead','rotor'] as const)test(`${kind} head immunity, release and actual head-only row survive in game`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async kind=>{
  // @ts-expect-error Vite module fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextWeapon=g.chaos.nextEvent=1e9;
  const idle={axis:0,pressed:false,released:false,stomp:false},step=(held=true)=>{g.input.consume=()=>({...idle,saw:held});g.state='RUNNING';(g as unknown as {fixedUpdate():void}).fixedUpdate();g.state='PAUSED';};
  g.weapons.collect(kind);g.weapons.collect('saw');g.weapons.select(kind);g.player.damage.parts.head=.8;
  g.player.collider.setEnabled(false);g.player.ragdoll.knockDown({x:0,y:2.15,z:0},{x:0,y:0,z:0},g.now);
  const head=g.player.ragdoll.parts.find(p=>p.limb==='head')!,headId=head.id,headPoly=head.poly;
  g.detector.arm(3,g.now);g.detector.rows[3].fireAt=g.now;step();
  const survived={headPresent:g.physics.parts.has(headId),samePoly:g.physics.parts.get(headId)?.poly===headPoly,strength:g.player.damage.parts.head,tissue:g.player.damage.tissue.head,immune:g.player.damage.headImmune,alive:g.player.damage.alive};
  step(false);const released=g.player.damage.headImmune;g.weapons.update({...idle,saw:true},1/60);g.weapons.select('saw');const switched=g.player.damage.headImmune;
  let consumed=0,remnants:number|null=null,blood=0;
  if(kind==='svarlHead'){
   g.weapons.select(kind);const center=head.body.translation(),before=g.gore.emitted;
   for(let i=0;i<12;i++)g.physics.createPart(box(.06,.06,.06),{position:{x:center.x+(i%4-.5)*.1,y:center.y+.15,z:0},rotation:{x:0,y:0,z:0,w:1}},1,100+i,'meal');
   step();consumed=g.weapons.cuts.length;remnants=[...g.physics.parts.values()].filter(p=>p.owner==='npc').length;blood=g.gore.emitted-before;
  }
  return {survived,released,switched,consumed,remnants,blood,faults:g.physics.numericFaults};
 },kind);
 expect(result.survived).toEqual({headPresent:true,samePoly:true,strength:.8,tissue:1,immune:true,alive:true});expect(result.released).toBe(false);expect(result.switched).toBe(false);
 if(kind==='svarlHead'){expect(result.consumed).toBe(12);expect(result.remnants).toBe(0);expect(result.blood).toBeGreaterThan(0);}
 expect(result.faults).toBe(0);expect(errors).toEqual([]);
});
