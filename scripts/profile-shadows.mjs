// Production rendering diagnostic, not an FPS acceptance test.
// Usage: node scripts/profile-shadows.mjs http://127.0.0.1:5174
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto(process.argv[2]??'http://127.0.0.1:5174');await page.waitForFunction(()=>!!window.humanthrower);
 const report=await page.evaluate(()=>{
  const g=window.humanthrower,r=g.renderer;g.pause();r.configure({resolution:'426x240',intensity:.75});g.saw.enabled=false;
  // 20 active full NPCs +120 explicitly sleeping detached greybox parts. Frozen
  // pose diagnostic: no physics stepping, no claim of long-lived pile stability.
  for(let i=0;i<20;i++)g.factory.spawn('normal',{x:(i%5-2)*1.55,y:1+Math.floor(i/5)*2.8,z:0},{x:0,y:0,z:0,w:1},false,{velocity:{x:0,y:0,z:0}});
  const source=[...g.physics.parts.values()][0];
  for(let i=0;i<120;i++){const p=g.physics.createPart(source.poly,{position:{x:(i%10-4.5)*.75,y:.3+Math.floor(i/10)*.75,z:-.45},rotation:{x:0,y:0,z:0,w:1}},1,1000+i,'head');p.body.sleep();}
  g.physics.snapshot();const rows=[];
  const draw=()=>r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);
  const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];
  for(const size of [0,128,256,512]){
   r.configure({shadowSize:size});for(let i=0;i<8;i++)draw();const render=[],shadow=[];const sync=[];
   for(let i=0;i<40;i++){draw();render.push(r.renderStats.submissionMs);shadow.push(r.renderStats.shadowSubmissionMs);}
   // gl.finish explicitly forces software-GPU completion; this is blocking
   // end-to-end diagnostic, not an asynchronous GPU timer query result.
   for(let i=0;i<6;i++){const start=performance.now();draw();r.renderer.getContext().finish();sync.push(performance.now()-start);}
   rows.push({size,renderSubmitP95:percentile(render,.95),shadowSubmitP95:percentile(shadow,.95),blockingFinishP95:percentile(sync,.95),...r.renderStats,casters:r.shadows.snapshot.casters,memory:{...r.renderer.info.memory}});
  }
  const gl=r.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {profile:'headless Chromium SwiftShader; NOT reference-hardware acceptance',userAgent:navigator.userAgent,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',parts:g.physics.parts.size,active:[...g.physics.parts.values()].filter(p=>!p.body.isSleeping()).length,sleeping:[...g.physics.parts.values()].filter(p=>p.body.isSleeping()).length,rows};
 });console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
