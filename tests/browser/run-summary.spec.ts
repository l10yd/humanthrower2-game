import {test,expect} from '@playwright/test';
const boot=async(page:import('@playwright/test').Page)=>{await page.goto('/?art=off');await expect(page.locator('#start')).toBeEnabled();};
const finish=async(page:import('@playwright/test').Page)=>page.evaluate(()=>{
 const g=window.humanthrower;g.restart(42);g.pause();g.state='RUNNING';g.scheduler.next=g.chaos.nextWeapon=g.chaos.nextEvent=g.chaos.nextMedkit=1e9;g.now=12.4;g.scoring.points=300;g.scoring.rows=3;g.chaos.events=2;g.medicalUsed=1;g.player.damage.parts.head=0;
 const step=()=>(g as unknown as {fixedUpdate():void}).fixedUpdate();step();const score=g.scoring.total(g.now);g.start();const deathState=g.state;for(let n=0;n<120;n++)step();return {score,deathState,result:g.result,snapshot:g.debugSnapshot()};
});
test('record board persists, result is frozen and replay starts the exact same seed',async({page})=>{
 await boot(page);await expect(page.locator('#record-board')).toContainText('Пока нет забегов');await page.locator('#start').click();const report=await finish(page);
 expect(report.deathState).toBe('DYING');expect(report.result?.score).toBe(312);expect(report.result?.durationSeconds).toBe(12.4);
 await expect(page.locator('#run-details')).toContainText('300');await expect(page.locator('#run-details')).toContainText('Seed: 42');await expect(page.locator('#summary')).toContainText('НОВЫЙ РЕКОРД');
 await page.waitForTimeout(200);expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(report.snapshot);
 await page.locator('#replay-run').click();expect(await page.evaluate(()=>({seed:window.humanthrower.seed,state:window.humanthrower.state,result:window.humanthrower.result}))).toEqual({seed:42,state:'RUNNING',result:null});await page.locator('#pause').click();
 await page.locator('#pause-title').click();await expect(page.locator('#record-board')).toContainText('312 очков');await page.reload();await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#record-board')).toContainText('312 очков');
});
test('title exit at time zero cannot resume a dead player, and repeat ignores later settings changes',async({page})=>{
 await boot(page);await page.locator('#start').click();
 await page.evaluate(()=>{const g=window.humanthrower;g.restart(17);g.pause();g.state='RUNNING';g.player.damage.parts.head=0;(g as unknown as {fixedUpdate():void}).fixedUpdate();g.showTitle();});
 await page.locator('#start').click();expect(await page.evaluate(()=>window.humanthrower.player.damage.alive)).toBe(true);await finish(page);
 await page.evaluate(()=>{window.humanthrower.preferences.setHeadControlFaults(true);});await page.keyboard.press('t');
 expect(await page.evaluate(()=>({seed:window.humanthrower.seed,faults:window.humanthrower.preferences.settings.headControlFaults}))).toEqual({seed:42,faults:false});
});
test('storage write failures retain record board without aborting the result',async({page})=>{
 await boot(page);await page.locator('#start').click();await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture.
  const {RecordStore}=await import('/src/gameplay/RecordStore.ts');window.humanthrower.records=new RecordStore({getItem:()=>null,setItem:()=>{throw Error('quota');}});
 });await finish(page);await expect(page.locator('#summary')).toContainText('только эта вкладка');await page.locator('#title').click();await expect(page.locator('#record-board')).toContainText('312 очков');
});
