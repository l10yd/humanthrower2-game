import { test,expect } from '@playwright/test';
test('actual descending impacts kill a vital part even while ragdolled, before the delayed result',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL.
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.restart();g.pause();g.state='RUNNING';g.scheduler.next=1e9;g.scheduler.nextBurst=1e9;g.chaos.nextWeapon=g.chaos.nextEvent=1e9;
  g.survival.breathe=()=>null; // Isolate impact lethality from a fixture-created trap.
  const step=()=>(g as unknown as {fixedUpdate():void}).fixedUpdate();
  const hits:number[]=[],strength:number[]=[];
  for(let n=0;n<16&&g.state==='RUNNING';n++){
   for(let i=0;i<85&&g.state==='RUNNING';i++)step();if(g.state!=='RUNNING')break;
   const template=g.player.ragdoll.visualParts.find(p=>p.name==='head')!;
   const head=g.player.ragdoll.down?g.player.ragdoll.parts.find(p=>p.limb==='head')!.body.translation():{x:g.player.current.x+template.position.x,y:g.player.current.y+template.position.y,z:0};
   const load=g.physics.createPart(box(.15,.1,.15),{position:{x:head.x,y:head.y+.8,z:head.z},rotation:{x:0,y:0,z:0,w:1}},22,100+n,'impactFixture');load.body.setLinvel({x:0,y:-10,z:0},true);
   const before=g.survival.hits;for(let i=0;i<45&&g.state==='RUNNING'&&g.survival.hits===before;i++)step();
   hits.push(g.survival.hits);strength.push(g.player.damage.parts.head);g.physics.removePart(load.id);
  }
  const dying=g.debugSnapshot();for(let i=0;i<120&&g.debugSnapshot().state==='DYING';i++)step();
  return {snapshot:g.debugSnapshot(),dying,hits,strength};
 });
 expect(result.hits.length).toBeGreaterThanOrEqual(3);expect(result.strength[0]).toBeLessThan(1);
 // A prone head can overlap the torso's sweep; the nearest actually hit vital
 // part may be chest rather than the nominally targeted head.
 expect(Math.min(result.snapshot.damage.parts.head,result.snapshot.damage.parts.chest,result.snapshot.damage.parts.pelvis)).toBe(0);
 expect(result.dying.state).toBe('DYING');expect(result.dying.result).toBeNull();expect(result.snapshot.result?.lossReason).toBe('IMPACT');
 await expect(page.locator('#overlay h1')).toHaveText('ПОГИБ ОТ УДАРОВ');
});
