import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {analyzeJointBlocks} from './native-joint-block-analysis.mjs';
const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: node scripts/analyze-native-joint-blocks.mjs <trace.json> <report.json>');
const captured=JSON.parse(await readFile(resolve(input),'utf8')),analysis=analyzeJointBlocks(captured.trace);
const report={source:resolve(input),scope:'Read-only native row transformation/CCD attribution; not a physics acceptance result',
 observer:captureObserver(captured.summary),analysis,
 geometry:captured.trace.rows.filter(r=>r.event==='pipeline-joint-geometry'||r.event==='ccd-body-clamp')};
function captureObserver(s){return {exactToPublished:s.exactToPublished,observerStatesExact:s.observerStatesExact,observerSnapshotExact:s.observerSnapshotExact,dropped:s.dropped};}
await mkdir(resolve(output,'..'),{recursive:true});await writeFile(resolve(output),JSON.stringify(report,null,2));
console.log(JSON.stringify({blocks:analysis.blocks,maxJacobianError:analysis.maxJacobianError,maxRhsError:analysis.maxRhsError,maxResidualTransformError:analysis.maxResidualTransformError,geometryEvents:report.geometry.length,observer:report.observer},null,2));
if(analysis.blocks===0||[analysis.maxJacobianError,analysis.maxRhsError,analysis.maxInverseMassError,analysis.maxResidualTransformError].some(v=>!Number.isFinite(v)||v>.0001)||!captured.summary.exactToPublished||!captured.summary.observerSnapshotExact||captured.trace.dropped)process.exitCode=1;
