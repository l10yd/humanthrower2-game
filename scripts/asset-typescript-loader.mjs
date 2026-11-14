// CLI-only loader: transpile project TypeScript in memory, without starting Vite
// or watching the filesystem. Production browser builds still use Vite/tsc.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const sourceRoot=new URL('../src/',import.meta.url).href;
export async function resolve(specifier,context,nextResolve){
 const local=context.parentURL?.startsWith(sourceRoot)&&(specifier.startsWith('./')||specifier.startsWith('../'));
 if(local&&!/\.[a-z]+$/i.test(specifier))return nextResolve(`${specifier}.ts`,context);
 return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){
 if(!url.startsWith(sourceRoot)||!url.endsWith('.ts'))return nextLoad(url,context);
 const source=await readFile(fileURLToPath(url),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},fileName:fileURLToPath(url)});
 return {format:'module',source:output.outputText,shortCircuit:true};
}
