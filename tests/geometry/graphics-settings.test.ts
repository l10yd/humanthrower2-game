import { describe, expect, it } from 'vitest';
import { DEFAULT_RETRO, validateRetro } from '../../src/rendering/RetroSettings';
describe('bounded independent graphics settings',()=>{
 it('clamps degradation and preserves defaults for non-finite/unknown input',()=>{
  const s=validateRetro({intensity:4,jitter:1,grain:NaN,lightingLevels:8.8,resolution:'invalid' as never});
  expect(s.intensity).toBe(1);expect(s.jitter).toBe(.35);expect(s.grain).toBe(DEFAULT_RETRO.grain);expect(s.lightingLevels).toBe(9);expect(s.resolution).toBe(DEFAULT_RETRO.resolution);
 });
 it('shadow sizes are discrete, optional, and independent of degradation intensity',()=>{
  for(const shadowSize of [0,128,256,512] as const)expect(validateRetro({shadowSize,intensity:0}).shadowSize).toBe(shadowSize);
  expect(validateRetro({shadowSize:1024 as never}).shadowSize).toBe(256);
  expect(validateRetro({shadowSize:NaN as never}).shadowSize).toBe(256);
 });
 it('intensity zero retains the chosen low resolution without rewriting effect presets',()=>{
  const s=validateRetro({intensity:0,resolution:'320x240'});expect(s.intensity).toBe(0);expect(s.resolution).toBe('320x240');expect(s.affine).toBe(DEFAULT_RETRO.affine);
 });
});
