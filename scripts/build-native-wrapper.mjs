import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build} from 'vite';
// Only 3D compat wrapper; original TypeScript + pinned upstream compat overrides.
// No physics code or wasm binary modifications.
const output=resolve(process.env.HUMANTHROWER_NATIVE_OUTPUT??'.pi/native-build/wrapper-package');
const root=resolve('.pi/native-build'),source=join(root,'source/bindings/typescript'),base=join(root,`wrapper-${process.env.HUMANTHROWER_NATIVE_VARIANT??'default'}`),gen=join(base,'gen3d'),dist=join(base,'pkg/dist');
await mkdir(gen,{recursive:true});await mkdir(dist,{recursive:true});
await cp(join(source,'src.ts'),gen,{recursive:true});await cp(join(source,'rapier-compat/src3d'),gen,{recursive:true});
async function strip(directory){for(const e of await readdir(directory,{withFileTypes:true})){const path=join(directory,e.name);if(e.isDirectory())await strip(path);else if(e.name.endsWith('.ts')){
 let content=await readFile(path,'utf8');content=content.replace(/^.*#if DIM2.*\r?\n[\s\S]*?^.*#endif.*(?:\r?\n|$)/gm,'');await writeFile(path,content);
}}}
await strip(gen);
const wasm=resolve(process.env.HUMANTHROWER_NATIVE_WASM_DIR??join(source,'rapier-compat/builds/3d/wasm-build'));
for(const e of await readdir(wasm))if(e.startsWith('rapier_wasm3d'))await cp(join(wasm,e),join(dist,e));
await writeFile(join(base,'package.json'),JSON.stringify({type:'module'}));
await build({configFile:false,logLevel:'info',plugins:[{name:'inline-native-wasm',enforce:'pre',load:async id=>id.endsWith('rapier_wasm3d_bg.wasm')?`export default ${JSON.stringify((await readFile(id)).toString('base64'))}`:null}],resolve:{alias:{'base64-js':join(root,'tools/node_modules/base64-js/index.js')}},build:{emptyOutDir:false,outDir:output,minify:false,lib:{entry:join(gen,'rapier.ts'),formats:['es'],fileName:()=> 'rapier.mjs'}}});
await writeFile(join(output,'package.json'),JSON.stringify({name:'humanthrower-native-experiment',type:'module',exports:'./rapier.mjs'}));
console.log('Built isolated wrapper:',join(output,'rapier.mjs'));
