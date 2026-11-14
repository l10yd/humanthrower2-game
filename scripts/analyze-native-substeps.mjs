import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {analyzeNativeSubsteps} from './native-substep-analysis.mjs';
if(process.argv.length!==4)throw Error('Usage: node scripts/analyze-native-substeps.mjs <trace-report.json> <analysis.json>');
const source=JSON.parse(await readFile(resolve(process.argv[2]),'utf8')),analysis=analyzeNativeSubsteps(source.trace??source);
await writeFile(resolve(process.argv[3]),JSON.stringify(analysis,null,2));
console.log(JSON.stringify(analysis,null,2));
