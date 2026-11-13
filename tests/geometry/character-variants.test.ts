import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {inspectCharacterGlb} from '../../src/assets/CharacterGlb';
import {validateCharacterRestPose} from '../../src/assets/CharacterRestPose';
for(const [folder,stem,triangles] of [['reference-scout','scout',676],['reference-bruiser','bruiser',660]] as const){
 describe(stem,()=>{
  it('actual Blender export and authored joints obey the existing asset policy',()=>{
   const root=`public/assets/${folder}/`,file=readFileSync(`${root}${stem}.glb`),bytes=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength) as ArrayBuffer;
   const glb=inspectCharacterGlb(bytes),metadata=validateCharacterRestPose(JSON.parse(readFileSync(`${root}${stem}.metadata.json`,'utf8')));
   expect(glb.declaredTriangles).toBe(triangles);expect(glb.images).toHaveLength(1);expect(glb.images[0]).toMatchObject({width:128,height:128});expect(metadata.parts).toHaveLength(11);expect(metadata.joints).toHaveLength(10);
  });
 });
}
