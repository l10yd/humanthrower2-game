// Production real-RAF stress runner. Not a device/GPU acceptance substitute.
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,extname,dirname,sep} from 'node:path';
import os from 'node:os';
const seconds=Number(process.env.HUMANTHROWER_STRESS_SECONDS??60),seeds=(process.env.HUMANTHROWER_STRESS_SEEDS??'17,42').split(',').map(Number);
if(!Number.isFinite(seconds)||seconds<1||seconds>600||!seeds.length||seeds.length>32||seeds.some(s=>!Number.isInteger(s)||s<0||s>0xffffffff))throw Error('Invalid stress duration/seeds');
const headless=process.env.HUMANTHROWER_STRESS_HARDWARE!=='1',output=resolve(process.argv[2]??'test-results/default-stress.json'),root=resolve('dist');
const workload=await readFile('scripts/contact-workload.mjs','utf8');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/diagnostic-contact-workload.js'){res.setHeader('Content-Type','text/javascript');res.end(workload);return;}
 const path=resolve(root,'.'+decodeURIComponent(pathname)),rel=relative(root,path);if(rel==='..'||rel.startsWith('..'+sep)||rel.includes('\0'))throw Error('Invalid path');
 const file=path===root?resolve(root,'index.html'):path;res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.statusCode=404;res.end('Not found');}});
let browser;const reports=[];
try{
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
 browser=await chromium.launch({headless,args:headless?['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']:[]});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/?profile${process.env.HUMANTHROWER_GEOMETRY_WORKER==='1'?'&geometry-worker':''}`);await page.waitForFunction(()=>!!window.humanthrower);
 for(const seed of seeds){
  const report=await page.evaluate(async({seed,seconds})=>{
   const {contactWorkload}=await import('/diagnostic-contact-workload.js');
   const g=window.humanthrower;g.restart(seed);g.profiler.enabled=true;
   let frame=0,tick=0;const consume=g.input.consume;g.input.consume=()=>{const inputTick=tick++;return {axis:g.player.current.x>2.8?-1:g.player.current.x<-2.8?1:Math.floor(g.now/3)%2?1:-1,stomp:false,saw:true,pressed:inputTick%12===0,released:inputTick%12===1,effortPresses:inputTick%6===0?1:0,jumpPresses:inputTick%12===0?1:0};};
   const intervals=[],submission=[],checkpoints=[];let previous=performance.now(),start=previous,lastCheckpoint=0,peakParts=0;
   try{
    await new Promise(resolve=>{const sample=timestamp=>{
     frame++;intervals.push(timestamp-previous);previous=timestamp;submission.push(g.renderer.renderStats.submissionMs);peakParts=Math.max(peakParts,g.physics.parts.size);
     if(timestamp-start-lastCheckpoint>=10000){lastCheckpoint=timestamp-start;checkpoints.push({wallSeconds:lastCheckpoint/1000,time:g.now,droppedTime:g.droppedTime,workload:contactWorkload(g.physics),profile:g.profiler.snapshot});}
     if(timestamp-start>=seconds*1000||['GAME_OVER','ERROR'].includes(g.state)){resolve();return;}requestAnimationFrame(sample);
    };requestAnimationFrame(sample);});
   }finally{g.input.consume=consume;g.pause();}
   const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {count:sorted.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],max:sorted.at(-1)};};
   const duration=(previous-start)/1000,gl=g.renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown';
   return {seed,state:g.state,completedStressWindow:duration>=seconds,wallSeconds:duration,simulationTime:g.now,observedRafFps:frame/duration,frameIntervalsMs:summary(intervals),submissionMs:summary(submission),peakParts,droppedTime:g.droppedTime,checkpoints,final:{allocationQueries:{...g.physics.allocationQueries},rowPreparation:g.rowPreparation.snapshot,workload:contactWorkload(g.physics),profile:g.profiler.snapshot,render:{...g.renderer.renderStats},batches:g.renderer.batches.snapshot},maxSpeed:g.physics.maxSpeed,maxAngular:g.physics.maxAngularSpeed,numericFaults:g.physics.numericFaults,art:!!g.renderer.character,environment:!!g.renderer.shaft,blood:g.gore.mode,mode:g.mode,npcMode:g.npcMode,gpu};
  },{seed,seconds});
  reports.push(report);await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({complete:false,reports},null,2));console.log(JSON.stringify({seed,fps:report.observedRafFps,droppedTime:report.droppedTime,time:report.simulationTime,gpu:report.gpu}));
 }
 const hardware=headless?false:reports.every(r=>!/swiftshader|llvmpipe|software|unknown/i.test(r.gpu));
 const failures=[];for(const r of reports){
  if(!r.art||!r.environment||r.blood!=='full'||r.mode!=='demo'||r.npcMode!=='twitch')failures.push(`${r.seed}: not default-art workload`);
  if(!r.completedStressWindow)failures.push(`${r.seed}: natural defeat truncated requested stress window`);
  if(r.numericFaults||r.state==='ERROR')failures.push(`${r.seed}: numerical/runtime error`);
  if(r.maxSpeed>=25||r.maxAngular>=35)failures.push(`${r.seed}: strict 25/35 stability failure`);
  if(r.final.render.totalCalls>=180)failures.push(`${r.seed}: total calls >=180`);
  if(r.submissionMs.p95>3)failures.push(`${r.seed}: render CPU submission p95 >3ms`);
  if(r.checkpoints.some(c=>(c.profile.timings.physics?.p95??0)>5))failures.push(`${r.seed}: checkpoint physics p95 >5ms`);
  if(r.checkpoints.some(c=>(c.profile.timings.occupancy?.p95??0)>2))failures.push(`${r.seed}: checkpoint occupancy p95 >2ms`);
  if(r.checkpoints.some(c=>(c.profile.timings.rowClear?.p95??0)>8))failures.push(`${r.seed}: sampled row preparation/commit p95 >8ms`);
  if(hardware&&r.observedRafFps<60)failures.push(`${r.seed}: observed hardware RAF below60`);
  if(r.droppedTime>.1)failures.push(`${r.seed}: droppedTime exceeds diagnostic .1s allowance`);
 }
 if(!hardware)failures.push('No real hardware FPS evidence; headless/software run is diagnostic only');if(errors.length)failures.push(...errors);
 await writeFile(output,JSON.stringify({complete:true,generatedAt:new Date().toISOString(),cpu:os.cpus()[0].model,seconds,hardwareObserved:hardware,localStressPassed:hardware&&!failures.length,accepted:false,unmeasured:['GPU timings','agreed reference-device stress workload'],failures,method:'Production default-art actual RAF loop with render + fixed simulation; deterministic bot. Contact graph sampled every10s outside measured fixed ticks. No FPS/GPU/device claim for SwiftShader. Natural defeat may censor duration; no invulnerability or forced sleep.',reports},null,2));
 console.log(`Stress written: ${output}`);if(failures.length)process.exitCode=1;
}finally{await browser?.close();if(server.listening)await new Promise(r=>server.close(r));}
