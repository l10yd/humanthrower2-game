import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
// Requires a running dev server. Diagnostic bot, NOT human playtest/FPS acceptance.
const url=process.argv[2]??'http://127.0.0.1:5173',output=resolve(process.argv[3]??'.pi/balance-10-sessions.json'),seconds=Number(process.argv[4]??90);
if(!Number.isFinite(seconds)||seconds<1||seconds>300)throw Error('Duration must be 1..300 simulated seconds');
const sessions=[],errors=[],runErrors=[];let expected=0,rulesVersion=null;
const median=values=>{const a=[...values].sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
async function save(complete){
 const groups=['idle','saw'].map(policy=>{
  const rows=sessions.filter(r=>r.policy===policy),deaths=rows.filter(r=>r.status==='defeat');
  return {policy,runs:rows.length,defeats:deaths.length,censored:rows.filter(r=>r.status==='censored').length,errors:rows.filter(r=>r.status==='error').length,medianObservedDuration:median(rows.map(r=>r.durationSeconds)),medianDefeatDuration:median(deaths.map(r=>r.durationSeconds)),rows:rows.reduce((s,r)=>s+r.rows,0),cuts:rows.reduce((s,r)=>s+r.weaponCuts,0),escapes:rows.reduce((s,r)=>s+r.escapes,0),lossReasons:Object.fromEntries([...new Set(deaths.map(r=>r.lossReason))].map(reason=>[reason,deaths.filter(r=>r.lossReason===reason).length]))};
 });
 const report={schemaVersion:1,complete,expectedSessions:expected,profile:'headless Chromium; fixed-step diagnostic bot; NOT human playtest or reference FPS',rulesVersion,maximumSimulatedSeconds:seconds,
  limitations:['Five seeds, paired idle/saw policies.','Bot aims at exact world body positions, unlike a human.','Runs at the duration limit are right-censored, not defeats.','Does not certify 4–8 minute first-attempt GDD balance or angular/thin stability.','No runtime balance or physics criteria were changed.'],groups,sessions,browserErrors:errors,runErrors};
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2));return groups;
}
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>!!window.humanthrower,{timeout:15000});
 const cases=await page.evaluate(async()=>{const {BALANCE_CASES}=await import('/tests/fixtures/BalanceSession.ts');return BALANCE_CASES;});expected=cases.length;
 rulesVersion=await page.evaluate(()=>window.humanthrower.recordProfile.rulesVersion);
 for(const c of cases){
  const result=await page.evaluate(async({seed,policy,seconds})=>{const {runBalanceSession}=await import('/tests/fixtures/BalanceSession.ts');return runBalanceSession(window.humanthrower,seed,policy,seconds);},{...c,seconds});
  sessions.push(result);await save(false);console.log(`${sessions.length}/${cases.length} seed=${c.seed} ${c.policy} ${result.status} ${result.durationSeconds.toFixed(2)}s ${result.lossReason??''} rows=${result.rows} cuts=${result.weaponCuts} escapes=${result.escapes} omega=${result.maxAngularSpeed.toFixed(2)}`);
 }
 const groups=await save(true);console.log(JSON.stringify({groups,browserErrors:errors,output},null,2));
 if(errors.length||sessions.some(s=>s.error||s.numericFaults))process.exitCode=1;
}catch(e){runErrors.push(String(e));await save(false);throw e;}
finally{await browser.close();}
