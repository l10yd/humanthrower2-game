import { readFile,stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { register } from 'node:module';

const args=process.argv.slice(2),json=args.includes('--json'),paths=args.filter(a=>a!=='--json');
if(paths.length!==2||args.some(a=>a.startsWith('--')&&a!=='--json')){
 console.error('Usage: npm run validate:asset -- <character.glb> <character.metadata.json> [--json]');process.exitCode=2;
}else{
 try{
  const glb=resolve(paths[0]),metadata=resolve(paths[1]),[modelStat,metaStat]=await Promise.all([stat(glb),stat(metadata)]);
  if(!modelStat.isFile()||!metaStat.isFile()||modelStat.size>16*1024*1024||metaStat.size>1024*1024)throw Error('Asset file size limit exceeded or not a regular file');
  const [model,source]=await Promise.all([readFile(glb),readFile(metadata,'utf8')]);
  register('./asset-typescript-loader.mjs',import.meta.url);
  const {validateOfflineCharacter}=await import('../src/assets/OfflineCharacter.ts');
  const report=validateOfflineCharacter(model.buffer.slice(model.byteOffset,model.byteOffset+model.byteLength),JSON.parse(source));
  if(json)console.log(JSON.stringify({ok:true,glb,metadata,...report},null,2));
  else{console.log(`PASS ${glb}\n${report.parts} parts, ${report.triangles} triangles, ${report.mass.toFixed(2)} kg, ${report.connectors} connectors; sampled surface error ${(report.maxSurfaceError*100).toFixed(3)} cm; certified upper bound ${(report.surfaceUpperBound*100).toFixed(3)} cm (${report.surfaceCells} cells)`);for(const limitation of report.limitations)console.log(`NOTE ${limitation}`);}
 }catch(error){const message=error instanceof Error?error.message:String(error);if(json)console.log(JSON.stringify({ok:false,error:message}));else console.error(`FAIL ${message}`);process.exitCode=1;}
}
