import { beforeAll,it,expect } from 'vitest';
import { RAPIER } from '../../src/physics/PhysicsManager';
import { validateCharacterRestPose } from '../../src/assets/CharacterRestPose';
import { metadataFixture } from '../fixtures/CharacterMetadataFixture';
import { restPoseFixture } from '../fixtures/CharacterRestFixture';
import { axisAngle,vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('accepts a tangent non-overlapping branched rest pose without changing the metadata',()=>{
 const data=restPoseFixture(),before=JSON.stringify(data);expect(validateCharacterRestPose(data).parts).toHaveLength(11);expect(JSON.stringify(data)).toBe(before);
});
it('a schema-valid overlapping rig still fails the physical rest-pose gate',()=>{
 expect(()=>validateCharacterRestPose(metadataFixture())).toThrow('Non-neighbor rest overlap');
});
it('rejects inconsistent rest joint frames and rest angles excluded by their limits',()=>{
 const frame=restPoseFixture();frame.joints[0].frameB=axisAngle(vec(0,1,0),.2);expect(()=>validateCharacterRestPose(frame)).toThrow('frames disagree');
 const range=restPoseFixture();range.joints[0].limits=[[.1,.5],[-1,1],[-1,1]];expect(()=>validateCharacterRestPose(range)).toThrow('outside joint range');
});
