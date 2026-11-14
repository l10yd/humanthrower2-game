// Production CPU diagnostic, NOT an FPS / reference-GPU acceptance test.
// npm run profile:default -- test-results/default-profile.json
// Optional env: HUMANTHROWER_PROFILE_SECONDS=60, HUMANTHROWER_PROFILE_SEEDS=17,42
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,extname,dirname,sep} from 'node:path';
import os from 'node:os';
const seconds=Number(process.env.HUMANTHROWER_PROFILE_SECONDS??60);
const seeds=(process.env.HUMANTHROWER_PROFILE_SEEDS??'17,42,93,20261111').split(',').map(Number);
if(!Number.isFinite(seconds)||seconds<=0||seconds>600||!seeds.length||seeds.length>32||seeds.some(s=>!Number.isInteger(s)||s<0||s>0xffffffff))throw Error('Invalid profile duration/seeds');
const output=resolve(process.argv[2]??'test-results/default-profile.json'),root=resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)),rel=relative(root,path);
  if(rel==='..'||rel.startsWith('..'+sep)||rel.includes('\0'))throw Error('Invalid path');
  const file=path===root?resolve(root,'index.html'):path,data=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(data);
 }catch{res.statusCode=404;res.end('Not found');}
});
let browser;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>!!window.humanthrower);
 const data=await page.evaluate(({seeds,seconds})=>{
  const g=window.humanthrower,reports=[];
  const capture=()=>({simulationTime:g.now,state:g.state,parts:g.physics.parts.size,sleeping:[...g.physics.parts.values()].filter(p=>p.body.isSleeping()).length,joints:g.physics.joints.size,geometry:g.physics.geometryUsage,gore:g.gore.snapshot,clearQueries:{...g.physics.clearQueries},phase:g.player.state,profile:g.profiler.snapshot});
  for(const seed of seeds){
   g.restart(seed);g.pause();g.profiler.enabled=true;g.state='RUNNING';let frame=0,error=null,maxParts=0;const checkpoints=[];
   const input=g.input.consume;g.input.consume=()=>({axis:g.player.current.x>2.8?-1:g.player.current.x<-2.8?1:Math.floor(g.now/3)%2?1:-1,stomp:false,saw:true,pressed:frame%12===0,released:frame%12===1,effortPresses:frame%6===0?1:0,jumpPresses:frame%12===0?1:0});
   try{
    for(;frame<Math.ceil(seconds*60)&&(g.state==='RUNNING'||g.state==='DYING');frame++){
     g.fixedUpdate();maxParts=Math.max(maxParts,g.physics.parts.size);
     if((frame+1)%600===0)checkpoints.push(capture());
    }
   }catch(e){error=String(e);}finally{g.input.consume=input;g.pause();}
   const final=capture();g.profiler.enabled=false;
   const draw=()=>g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.visualTime,1,g.saw,g.gore,g.weapons);
   for(let i=0;i<8;i++)draw();const submission=[];for(let i=0;i<20;i++){draw();submission.push(g.renderer.renderStats.submissionMs);}
   submission.sort((a,b)=>a-b);
   reports.push({seed,error,ticks:frame,maxParts,rows:g.rows,culled:g.culled,maxSpeed:g.physics.maxSpeed,maxAngular:g.physics.maxAngularSpeed,result:g.result,checkpoints,final,render:{...g.renderer.renderStats,submissionP95:submission[Math.floor(submission.length*.95)],stains:g.renderer.bloodBodyDecals,decals:g.renderer.bloodDecalStats}});
  }
  const gl=g.renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {browser:navigator.userAgent,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',art:!!g.renderer.character,environment:!!g.renderer.shaft,mode:g.mode,npcMode:g.npcMode,reports};
 },{seeds,seconds});
 await mkdir(dirname(output),{recursive:true});
 await writeFile(output,JSON.stringify({generatedAt:new Date().toISOString(),cpu:os.cpus()[0].model,node:process.version,seconds,method:'Production dist; default art/twitch/Full blood, deterministic bot fixed ticks. Profiler labels are nested, rolling 600 invocation samples, not padded zeros. No RAF/render during timed simulation; final render is frozen SwiftShader. Not FPS/reference-device acceptance.',...data},null,2));
 for(const r of data.reports)console.log(JSON.stringify({seed:r.seed,error:r.error,simulationTime:r.final.simulationTime,parts:r.final.parts,maxParts:r.maxParts,timings:r.final.profile.timings,drawCalls:r.render.totalCalls,maxAngular:r.maxAngular}));
 console.log(`Profile written: ${output}`);if(data.reports.some(r=>r.error))process.exitCode=1;
}finally{await browser?.close();if(server.listening)await new Promise(resolve=>server.close(resolve));}
