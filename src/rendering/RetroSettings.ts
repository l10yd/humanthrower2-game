import type { ShadowSize } from './LowResShadows';
export const RESOLUTIONS={'320x240':[320,240],'426x240':[426,240],'480x270':[480,270]} as const;
export interface RetroSettings {
  resolution:keyof typeof RESOLUTIONS;shadowSize:ShadowSize;intensity:number;snap:number;jitter:number;affine:number;wobble:number;
  grain:number;dither:number;vignette:number;chromatic:number;colorLevels:number;lightingLevels:number;
}
export const DEFAULT_RETRO:RetroSettings={resolution:'320x240',shadowSize:256,intensity:.75,snap:.75,jitter:.12,affine:.6,wobble:.12,
  grain:.015,dither:.6,vignette:.25,chromatic:.15,colorLevels:24,lightingLevels:8};
export function validateRetro(input:Partial<RetroSettings>,previous:RetroSettings=DEFAULT_RETRO):RetroSettings {
  const result={...previous};
  const bounds:Record<Exclude<keyof RetroSettings,'resolution'|'shadowSize'>,[number,number]>={intensity:[0,1],snap:[0,2],jitter:[0,.35],affine:[0,1],wobble:[0,.3],
    grain:[0,.04],dither:[0,1],vignette:[0,.45],chromatic:[0,.3],colorLevels:[16,32],lightingLevels:[6,16]};
  for(const key of Object.keys(bounds) as (keyof typeof bounds)[]){const value=input[key];if(value!==undefined&&Number.isFinite(value))result[key]=Math.max(bounds[key][0],Math.min(bounds[key][1],value));}
  if(input.shadowSize!==undefined&&[0,128,256,512].includes(input.shadowSize))result.shadowSize=input.shadowSize;
  if(input.resolution&&Object.hasOwn(RESOLUTIONS,input.resolution))result.resolution=input.resolution;
  result.colorLevels=Math.round(result.colorLevels);result.lightingLevels=Math.round(result.lightingLevels);return result;
}
