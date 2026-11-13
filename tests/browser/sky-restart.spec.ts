import {test,expect} from '@playwright/test';
test('restart recreates sky visuals even when item IDs are reused for another kind',async({page})=>{
 await page.goto('/?art=off');await expect(page.locator('#start')).toBeEnabled();
 const report=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart();g.pause();const render=()=>{g.renderer.skyDrops=g.sky.items;g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);};
  const first=g.sky.spawn('weapon',3,'axe');first.position.y=8;render();const old=g.renderer.scene.getObjectByName('Sky-weapon-1');
  g.restart();g.pause();const second=g.sky.spawn('medkit',3);second.position.y=8;render();
  const next=g.renderer.scene.getObjectByName('Sky-medkit-1');
  return {oldPresent:!!g.renderer.scene.getObjectByName('Sky-weapon-1'),newPresent:!!next,replaced:old!==next};
 });expect(report).toEqual({oldPresent:false,newPresent:true,replaced:true});
});
